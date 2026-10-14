import { asyncHandler } from '../utils/asyncHandler.js';
import { HttpError } from '../utils/httpError.js';
import { Order, OrderItem, User } from '../models/index.js';
import { normalizePhone } from '../utils/phone.js';
import {
  getPublicPaymentMethods,
  getXentripayClient,
  getXentripayWebhookSecret,
} from '../utils/payments/index.js';
import { normalizeCollection, verifyWebhookSignature } from '../utils/payments/xentripay.js';
import { sendOrderStatusEmail } from '../utils/emails.js';

const withItemsAndUser = [
  { model: OrderItem, as: 'items' },
  { model: User, as: 'user', attributes: ['id', 'email'] },
];

export const getMethods = asyncHandler(async (req, res) => {
  res.json({ data: await getPublicPaymentMethods() });
});

/** Idempotent: safe to call from the webhook and the status poll. */
async function markPaid(order) {
  if (order.status !== 'pending') return false;

  order.status = 'paid';
  order.paidAt = new Date();
  await order.save();

  if (order.user?.email) {
    sendOrderStatusEmail({ to: order.user.email, order, status: 'paid' }).catch((error) => {
      console.error('[emails] Payment-confirmed email failed for', order.orderNumber, error.message);
    });
  }

  return true;
}

async function findOrderForCollection(collection) {
  const where = [];
  if (collection.id) where.push({ paymentReference: String(collection.id) });
  if (collection.reference) where.push({ orderNumber: String(collection.reference).toUpperCase() });
  if (!where.length) return null;

  for (const clause of where) {
    const order = await Order.findOne({ where: { ...clause, paymentMethod: 'xentripay' }, include: withItemsAndUser });
    if (order) return order;
  }

  return null;
}

export const xentripayWebhook = asyncHandler(async (req, res) => {
  const secret = await getXentripayWebhookSecret();
  const headerName = (process.env.XENTRIPAY_SIGNATURE_HEADER || 'x-xentripay-signature').toLowerCase();
  const rawBody = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : JSON.stringify(req.body ?? {});

  if (!verifyWebhookSignature({ rawBody, signature: req.headers[headerName], secret })) {
    return res.status(400).send('Invalid webhook signature');
  }

  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return res.status(400).send('Webhook body is not JSON');
  }

  const collection = normalizeCollection(payload);
  const order = await findOrderForCollection(collection);

  if (order && collection.status === 'paid') {
    // Without a webhook secret, trust nothing: confirm with XentriPay directly.
    let confirmed = Boolean(secret);
    if (!confirmed) {
      const client = await getXentripayClient();
      const reference = order.paymentReference || collection.id;
      if (client && reference) {
        const fresh = await client.getCollection(reference).catch(() => null);
        confirmed = fresh?.status === 'paid';
      }
    }

    if (confirmed) await markPaid(order);
  }

  res.json({ received: true });
});

/**
 * Customers poll this after returning from XentriPay. If the webhook has not
 * arrived yet, ask XentriPay for the current state.
 */
export const orderPaymentStatus = asyncHandler(async (req, res) => {
  const orderNumber = String(req.params.orderNumber ?? '').trim().toUpperCase();
  const order = await Order.findOne({ where: { orderNumber }, include: withItemsAndUser });

  if (!order) throw new HttpError(404, 'No order with that number');

  const isOwner = Boolean(req.user) && order.userId === req.user.id;
  const isAdmin = req.user?.role === 'admin';
  const phoneMatches = order.customerPhone === normalizePhone(req.query.phone);

  if (!isOwner && !isAdmin && !phoneMatches) {
    throw new HttpError(403, 'Confirm the phone number used for this order');
  }

  if (order.paymentMethod === 'xentripay' && order.status === 'pending' && order.paymentReference) {
    const client = await getXentripayClient();
    if (client) {
      const fresh = await client.getCollection(order.paymentReference).catch(() => null);
      if (fresh?.status === 'paid') await markPaid(order);
    }
  }

  res.json({
    data: {
      orderNumber: order.orderNumber,
      status: order.status,
      paymentMethod: order.paymentMethod,
      checkoutUrl: order.status === 'pending' ? order.paymentCheckoutUrl : null,
      paidAt: order.paidAt,
    },
  });
});
