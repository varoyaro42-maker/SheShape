import { Op } from 'sequelize';
import sequelize from '../db.js';
import { Order, OrderItem, Product } from '../models/index.js';
import { HttpError } from '../utils/httpError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { buildUniqueOrderNumber } from '../utils/orderNumber.js';
import { normalizePhone } from '../utils/phone.js';
import { getStripeClient } from '../utils/stripe.js';
import { sendOrderConfirmationEmail } from '../utils/emails.js';

const MAX_LINES = 50;
const MAX_QUANTITY = 99;

const collectRequestedItems = (rawItems) => {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    throw new HttpError(400, 'Your cart is empty');
  }

  if (rawItems.length > MAX_LINES) {
    throw new HttpError(400, 'That is too many different items for one order');
  }

  const requested = new Map();

  for (const item of rawItems) {
    const productId = String(item?.productId ?? '').trim();
    const quantity = Number(item?.quantity);

    if (!productId) {
      throw new HttpError(400, 'Every cart item needs a product');
    }

    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
      throw new HttpError(400, `Quantities must be whole numbers between 1 and ${MAX_QUANTITY}`);
    }

    requested.set(productId, (requested.get(productId) ?? 0) + quantity);
  }

  return requested;
};

// Undo a freshly created order whose card payment could not be started, so
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

export const createOrder = asyncHandler(async (req, res) => {
  const { customerName, customerPhone, address, items } = req.body;
  const paymentMethod = req.body.paymentMethod === 'card' ? 'card' : 'cod';
  const requested = collectRequestedItems(items);

  // Resolve Stripe before touching stock, so an unavailable card payment never
  // leaves behind a pending order with inventory already reserved.
  const stripe = paymentMethod === 'card' ? await getStripeClient() : null;

  if (paymentMethod === 'card' && !stripe) {
    throw new HttpError(400, 'Card payment is not available right now. Choose cash on delivery.');
  }

  const { order: created, lines } = await sequelize.transaction(async (transaction) => {
    const products = await Product.findAll({
      where: { id: { [Op.in]: [...requested.keys()] }, isPublished: true },
      lock: transaction.LOCK.UPDATE,
      transaction,
    });

    if (products.length !== requested.size) {
      throw new HttpError(400, 'One of the items in your cart is no longer available');
    }

    const lines = products.map((product) => {
      const quantity = requested.get(product.id);

      if (product.stock < quantity) {
        throw new HttpError(
          409,
          product.stock === 0
            ? `${product.name} has just sold out`
            : `Only ${product.stock} left of ${product.name}`
        );
      }

      return {
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity,
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
        total: lines.reduce((sum, line) => sum + line.price * line.quantity, 0),
      },
      { transaction }
    );

    await OrderItem.bulkCreate(
      lines.map((line) => ({ ...line, orderId: order.id })),
      { transaction, validate: true }
    );

    for (const product of products) {
      await product.decrement('stock', { by: requested.get(product.id), transaction });
    }

    return { order, lines };
  });

  let clientSecret = null;

  if (stripe) {
    try {
      const paymentIntent = await stripe.paymentIntents.create(
        {
          amount: created.total,
          currency: 'rwf',
          automatic_payment_methods: { enabled: true },
          metadata: { orderId: created.id, orderNumber: created.orderNumber },
        },
        { idempotencyKey: `order-intent-${created.id}` }
      );

      created.stripePaymentIntentId = paymentIntent.id;
      await created.save();

      clientSecret = paymentIntent.client_secret;
    } catch (error) {
      console.error('[orders] Could not start card payment for', created.orderNumber, error.message);
      await releaseOrder(created, lines);
      throw new HttpError(502, 'We could not start the card payment. Try again or choose cash on delivery.');
    }
  }

  const order = await Order.findByPk(created.id, {
    include: [{ model: OrderItem, as: 'items' }],
  });

  if (req.user.email) {
    sendOrderConfirmationEmail({ to: req.user.email, order }).catch((error) => {
      console.error('[emails] Order confirmation failed for', order.orderNumber, error.message);
    });
  }

  res.status(201).json({ data: order, clientSecret });
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

  res.json({ data: order });
});
