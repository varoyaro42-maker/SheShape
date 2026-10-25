import { asyncHandler } from '../utils/asyncHandler.js';
import { HttpError } from '../utils/httpError.js';
import { Order, OrderItem, User } from '../models/index.js';
import { normalizePhone } from '../utils/phone.js';
import {
  getPublicPaymentMethods,
  getSettingsRow,
  getXentripayClient,
  getXentripayWebhookSecret,
} from '../utils/payments/index.js';
import { verifyWebhookSignature, webhookReferences } from '../utils/payments/xentripay.js';
import { sendOrderStatusEmail, clientUrl } from '../utils/emails.js';
import { handleEventWebhook } from './events.controller.js';
import { handlePayoutWebhook, isPayoutEvent } from './admin.payouts.controller.js';

const withItemsAndUser = [
  { model: OrderItem, as: 'items' },
  { model: User, as: 'user', attributes: ['id', 'email'] },
];

const ORDER_NUMBER = /^SS-\d{6}-[A-Z0-9]{4}/;

export const getMethods = asyncHandler(async (req, res) => {
  res.json({ data: await getPublicPaymentMethods() });
});

/** Idempotent: safe to call from the webhook and the status poll. */
export async function markPaid(order) {
  if (order.status !== 'pending') return false;

  order.status = 'paid';
  order.paidAt = new Date();
  order.paymentFailedAt = null;
  await order.save();

  if (order.user?.email) {
    sendOrderStatusEmail({ to: order.user.email, order, status: 'paid' }).catch((error) => {
      console.error('[emails] Payment-confirmed email failed for', order.orderNumber, error.message);
    });
  }

  return true;
}

async function markFailed(order) {
  if (order.status !== 'pending' || order.paymentFailedAt) return;
  order.paymentFailedAt = new Date();
  await order.save();
}

/** Ask XentriPay for the current state of an order's latest collection. */
export async function refreshFromXentripay(order) {
  if (order.paymentProvider !== 'xentripay' || order.status !== 'pending') return null;

  const client = await getXentripayClient();
  if (!client) return null;

  const reference = order.paymentReference || order.orderNumber;
  const fresh = await client.getCollectionStatus(reference).catch((error) => {
    console.error('[payments] Status check failed for', order.orderNumber, error.message);
    return null;
  });

  if (fresh?.status === 'paid') await markPaid(order);
  else if (fresh?.status === 'failed') await markFailed(order);

  return fresh?.status ?? null;
}

function paymentState(order) {
  if (order.status === 'paid' || order.status === 'shipped' || order.status === 'delivered') return 'paid';
  if (order.status === 'cancelled') return 'cancelled';
  if (order.paymentFailedAt) return 'failed';
  return 'pending';
}

async function findOrderForWebhook(payload) {
  const refs = webhookReferences(payload);
  if (!refs.length) return null;

  const byReference = await Order.findOne({
    where: { paymentReference: refs, paymentProvider: 'xentripay' },
    include: withItemsAndUser,
  });
  if (byReference) return byReference;

  // customerRef is our order number, or ORDER-n on retries.
  const numbers = refs.map((ref) => ref.toUpperCase().match(ORDER_NUMBER)?.[0]).filter(Boolean);
  if (!numbers.length) return null;

  return Order.findOne({ where: { orderNumber: numbers, paymentProvider: 'xentripay' }, include: withItemsAndUser });
}

/**
 * XentriPay posts signed JSON here. We acknowledge everything with 200 (so
 * they do not retry) and act on collection and payout outcomes.
 */
export const xentripayWebhook = asyncHandler(async (req, res) => {
  const rawBody = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : JSON.stringify(req.body ?? {});
  const secret = await getXentripayWebhookSecret();
  const signature = req.headers['x-xentripay-signature'];

  if (secret && !verifyWebhookSignature({ rawBody, signature, secret })) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return res.status(400).json({ error: 'Webhook body is not JSON' });
  }

  const event = String(payload?.event ?? req.headers['x-xentripay-event'] ?? '').toUpperCase();

  // Money we sent out, from the admin Payments page.
  if (isPayoutEvent(event)) {
    await handlePayoutWebhook({ event, references: webhookReferences(payload), trusted: Boolean(secret) });
    return res.json({ received: true });
  }

  const order = await findOrderForWebhook(payload);

  // Not a shop order: it may be an event ticket.
  if (!order) {
    await handleEventWebhook({ event, references: webhookReferences(payload), trusted: Boolean(secret) });
    return res.json({ received: true });
  }

  if (order) {
    if (event === 'COLLECTION_SUCCESSFUL') {
      // Without a secret we cannot trust the payload: confirm with XentriPay.
      if (secret) await markPaid(order);
      else await refreshFromXentripay(order);
    } else if (event === 'COLLECTION_FAILED') {
      await markFailed(order);
    }
  }

  res.json({ received: true });
});

async function loadOrderForCustomer(req) {
  const orderNumber = String(req.params.orderNumber ?? '').trim().toUpperCase();
  const order = await Order.findOne({ where: { orderNumber }, include: withItemsAndUser });

  if (!order) throw new HttpError(404, 'No order with that number');

  const isOwner = Boolean(req.user) && order.userId === req.user.id;
  const isAdmin = req.user?.role === 'admin';
  const phoneMatches = order.customerPhone === normalizePhone(req.query.phone ?? req.body?.phone);

  if (!isOwner && !isAdmin && !phoneMatches) {
    throw new HttpError(403, 'Confirm the phone number used for this order');
  }

  return order;
}

function statusPayload(order) {
  return {
    orderNumber: order.orderNumber,
    status: order.status,
    paymentMethod: order.paymentMethod,
    provider: order.paymentProvider,
    paymentStatus: paymentState(order),
    checkoutUrl: order.status === 'pending' && order.paymentMethod === 'card' ? order.paymentCheckoutUrl : null,
    attempts: order.paymentAttempts,
    paidAt: order.paidAt,
  };
}

/** Customers poll this while waiting for a MoMo prompt or after a card redirect. */
export const orderPaymentStatus = asyncHandler(async (req, res) => {
  const order = await loadOrderForCustomer(req);
  await refreshFromXentripay(order);
  res.json({ data: statusPayload(order) });
});

/** Start a fresh collection for a pending online order whose last attempt failed. */
export const retryPayment = asyncHandler(async (req, res) => {
  const order = await loadOrderForCustomer(req);

  if (order.status !== 'pending' || order.paymentProvider !== 'xentripay') {
    throw new HttpError(409, 'This order is not waiting for an online payment.');
  }

  const current = await refreshFromXentripay(order);
  if (current === 'paid') return res.json({ data: statusPayload(order) });

  const client = await getXentripayClient();
  if (!client) throw new HttpError(400, 'Online payment is not available right now.');

  const settings = await getSettingsRow();
  const attempt = order.paymentAttempts + 1;
  const customerRef = attempt > 1 ? `${order.orderNumber}-${attempt}` : order.orderNumber;
  const orderUrl = clientUrl(`/dashboard/order/${order.orderNumber}`);

  const collection = await client.initiateCollection({
    amount: order.total,
    reference: customerRef,
    description: `She Shape Wellness order ${order.orderNumber}`,
    customer: { name: order.customerName, email: order.user?.email ?? '', phone: order.customerPhone },
    method: order.paymentMethod,
    redirectUrl: orderUrl,
    returnUrl: orderUrl,
    chargesIncluded: settings.xentripayChargesIncluded !== false,
  }).catch((error) => {
    throw new HttpError(502, error.message || 'We could not restart the payment. Please try again.');
  });

  order.paymentAttempts = attempt;
  order.paymentReference = collection.reference || customerRef;
  order.paymentCheckoutUrl = collection.checkoutUrl;
  order.paymentFailedAt = null;
  await order.save();

  res.json({ data: { ...statusPayload(order), message: collection.message } });
});
