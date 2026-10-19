import { Op } from 'sequelize';
import sequelize from '../db.js';
import { Order, OrderItem, Product, ProductImage, PAYMENT_METHODS } from '../models/index.js';
import { HttpError } from '../utils/httpError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { buildUniqueOrderNumber } from '../utils/orderNumber.js';
import { normalizePhone } from '../utils/phone.js';
import { getPublicPaymentMethods, getSettingsRow, getXentripayClient } from '../utils/payments/index.js';
import { MIN_AMOUNT_RWF } from '../utils/payments/xentripay.js';
import { sendOrderConfirmationEmail, clientUrl } from '../utils/emails.js';

const MAX_LINES = 50;
const MAX_QUANTITY = 99;

const collectRequestedItems = (rawItems) => {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    throw new HttpError(400, 'Your cart is empty');
  }

  if (rawItems.length > MAX_LINES) {
    throw new HttpError(400, 'That is too many different items for one order');
  }

  // One line per product + colour + size; stock is counted per product.
  const lines = new Map();
  const perProduct = new Map();

  for (const item of rawItems) {
    const productId = String(item?.productId ?? '').trim();
    const quantity = Number(item?.quantity);
    const color = String(item?.color ?? '').trim().slice(0, 60) || null;
    const size = String(item?.size ?? '').trim().slice(0, 20) || null;

    if (!productId) {
      throw new HttpError(400, 'Every cart item needs a product');
    }

    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
      throw new HttpError(400, `Quantities must be whole numbers between 1 and ${MAX_QUANTITY}`);
    }

    const key = JSON.stringify([productId, color, size]);
    const line = lines.get(key) ?? { productId, color, size, quantity: 0 };
    line.quantity += quantity;
    lines.set(key, line);
    perProduct.set(productId, (perProduct.get(productId) ?? 0) + quantity);
  }

  return { lines: [...lines.values()], perProduct };
};

/** The colours a product offers: the colours its photos are tagged with. */
const productColors = (product) => [...new Set((product.images ?? []).map((image) => image.color).filter(Boolean))];

// Undo a freshly created order whose online payment could not be started, so
// the customer is not left with a pending order and the stock is not held.
async function releaseOrder(order, lines) {
  await sequelize.transaction(async (transaction) => {
    for (const line of lines) {
      await Product.increment('stock', {
        by: line.quantity,
        where: { id: line.productId },
        transaction,
      });
    }

    await OrderItem.destroy({ where: { orderId: order.id }, transaction });
    await order.destroy({ transaction });
  });
}

function paymentSummary(order, methods) {
  const pending = order.status === 'pending';
  const summary = {
    method: order.paymentMethod,
    provider: order.paymentProvider,
    checkoutUrl: null,
    momo: null,
    prompt: false,
    failedAt: order.paymentFailedAt,
  };

  if (order.paymentMethod === 'momo' && order.paymentProvider === 'manual' && methods.momo?.provider === 'manual') {
    summary.momo = methods.momo;
  }
  if (order.paymentMethod === 'momo' && order.paymentProvider === 'xentripay') {
    summary.prompt = pending;
  }
  if (order.paymentMethod === 'card' && pending) {
    summary.checkoutUrl = order.paymentCheckoutUrl;
  }

  return summary;
}

export const createOrder = asyncHandler(async (req, res) => {
  const { customerName, customerPhone, address, items } = req.body;
  const requested = collectRequestedItems(items);
  const requestedIds = [...requested.perProduct.keys()];

  const paymentMethod = PAYMENT_METHODS.includes(req.body.paymentMethod) ? req.body.paymentMethod : 'cod';
  const methods = await getPublicPaymentMethods();

  // Resolve the payment route before touching stock, so an unavailable method
  // never leaves behind a pending order with inventory already reserved.
  if (paymentMethod === 'momo' && !methods.momo) {
    throw new HttpError(400, 'Mobile money is not available right now. Choose cash on delivery.');
  }
  if (paymentMethod === 'card' && !methods.card) {
    throw new HttpError(400, 'Card payment is not available right now. Choose another payment method.');
  }

  const online = paymentMethod === 'card' || (paymentMethod === 'momo' && methods.momo?.provider === 'xentripay');
  const xentripay = online ? await getXentripayClient() : null;
  if (online && !xentripay) {
    throw new HttpError(400, 'Online payment is not available right now. Choose another payment method.');
  }

  const paymentProvider = online ? 'xentripay' : paymentMethod === 'momo' ? 'manual' : null;

  const { order: created, lines } = await sequelize.transaction(async (transaction) => {
    const products = await Product.findAll({
      where: { id: { [Op.in]: requestedIds }, isPublished: true },
      lock: transaction.LOCK.UPDATE,
      transaction,
    });

    if (products.length !== requestedIds.length) {
      throw new HttpError(400, 'One of the items in your cart is no longer available');
    }

    const images = await ProductImage.findAll({ where: { productId: requestedIds }, attributes: ['productId', 'color'], transaction });
    const byId = new Map(products.map((product) => [product.id, product]));

    for (const product of products) {
      const quantity = requested.perProduct.get(product.id);
      if (product.stock < quantity) {
        throw new HttpError(
          409,
          product.stock === 0
            ? `${product.name} has just sold out`
            : `Only ${product.stock} left of ${product.name}`
        );
      }
    }

    const lines = requested.lines.map((line) => {
      const product = byId.get(line.productId);
      const colors = productColors({ images: images.filter((image) => image.productId === product.id) });
      const sizes = product.sizes;

      if (colors.length && !colors.includes(line.color)) {
        throw new HttpError(400, `Choose a colour for ${product.name}.`);
      }
      if (sizes.length && !sizes.includes(line.size)) {
        throw new HttpError(400, `Choose a size for ${product.name}.`);
      }

      return {
        productId: product.id,
        name: product.name,
        price: product.price,
        color: colors.length ? line.color : null,
        size: sizes.length ? line.size : null,
        quantity: line.quantity,
      };
    });

    const order = await Order.create(
      {
        orderNumber: await buildUniqueOrderNumber(Order, transaction),
        userId: req.user.id,
        customerName,
        customerPhone,
        address,
        paymentMethod,
        paymentProvider,
        total: lines.reduce((sum, line) => sum + line.price * line.quantity, 0),
      },
      { transaction }
    );

    if (online && order.total < MIN_AMOUNT_RWF) {
      throw new HttpError(400, `Online payment needs a total of at least ${MIN_AMOUNT_RWF} RWF. Choose cash on delivery.`);
    }

    await OrderItem.bulkCreate(
      lines.map((line) => ({ ...line, orderId: order.id })),
      { transaction, validate: true }
    );

    for (const product of products) {
      await product.decrement('stock', { by: requested.perProduct.get(product.id), transaction });
    }

    return { order, lines };
  });

  let paymentMessage = '';

  if (xentripay) {
    try {
      const settings = await getSettingsRow();
      const orderUrl = clientUrl(`/dashboard/order/${created.orderNumber}`);
      const collection = await xentripay.initiateCollection({
        amount: created.total,
        reference: created.orderNumber,
        description: `She Shape Wellness order ${created.orderNumber}`,
        customer: { name: created.customerName, email: req.user.email, phone: created.customerPhone },
        method: paymentMethod,
        redirectUrl: orderUrl,
        returnUrl: orderUrl,
        chargesIncluded: settings.xentripayChargesIncluded === true,
      });

      created.paymentAttempts = 1;
      created.paymentReference = collection.reference || created.orderNumber;
      created.paymentCheckoutUrl = collection.checkoutUrl;
      await created.save();
      paymentMessage = collection.message;
    } catch (error) {
      console.error('[orders] Could not start XentriPay payment for', created.orderNumber, error.message);
      await releaseOrder(created, lines);
      throw new HttpError(
        502,
        paymentMethod === 'momo'
          ? 'We could not send the payment prompt to your phone. Check the number and try again, or choose cash on delivery.'
          : 'We could not start the card payment. Try again or choose another method.'
      );
    }
  }

  const order = await Order.findByPk(created.id, {
    include: [{ model: OrderItem, as: 'items' }],
  });

  const payment = { ...paymentSummary(order, methods), message: paymentMessage };

  if (req.user.email) {
    sendOrderConfirmationEmail({ to: req.user.email, order, payment }).catch((error) => {
      console.error('[emails] Order confirmation failed for', order.orderNumber, error.message);
    });
  }

  res.status(201).json({ data: order, payment });
});

export const listMyOrders = asyncHandler(async (req, res) => {
  const orders = await Order.findAll({
    where: { userId: req.user.id },
    include: [{ model: OrderItem, as: 'items' }],
    order: [['createdAt', 'DESC']],
  });

  res.json({ data: orders });
});

export const getOrderByNumber = asyncHandler(async (req, res) => {
  const orderNumber = String(req.params.orderNumber ?? '').trim().toUpperCase();

  const order = await Order.findOne({
    where: { orderNumber },
    include: [{ model: OrderItem, as: 'items' }],
  });

  if (!order) {
    throw new HttpError(404, 'No order with that number');
  }

  const isOwner = Boolean(req.user) && order.userId === req.user.id;
  const isAdmin = req.user?.role === 'admin';
  const phoneMatches = order.customerPhone === normalizePhone(req.query.phone);

  if (!isOwner && !isAdmin && !phoneMatches) {
    throw new HttpError(403, 'Confirm the phone number used for this order');
  }

  const methods = await getPublicPaymentMethods();

  res.json({ data: order, payment: paymentSummary(order, methods) });
});
