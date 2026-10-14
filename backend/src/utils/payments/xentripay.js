import crypto from 'node:crypto';

/**
 * XentriPay collections adapter.
 *
 * XentriPay publishes its endpoint reference through the merchant dashboard
 * and the Centrika account manager rather than on the public site, so the
 * request shape here follows the common Rwandan gateway pattern and every
 * path and field name is overridable from the environment. Once the
 * integration pack arrives, adjust COLLECT_PATH / STATUS_PATH and the body
 * in initiateCollection; nothing else in the app needs to change.
 */
const DEFAULT_LIVE_URL = 'https://api.xentripay.com/v1';
const DEFAULT_SANDBOX_URL = 'https://api.test.xentripay.com/v1';

const PAID = new Set(['success', 'successful', 'succeeded', 'paid', 'completed', 'complete', 'approved', 'settled']);
const FAILED = new Set(['failed', 'failure', 'declined', 'cancelled', 'canceled', 'expired', 'error', 'rejected']);

function pick(source, keys) {
  for (const key of keys) {
    const value = key.split('.').reduce((obj, part) => (obj == null ? undefined : obj[part]), source);
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return undefined;
}

export function normalizeStatus(value) {
  const status = String(value ?? '').trim().toLowerCase();
  if (PAID.has(status)) return 'paid';
  if (FAILED.has(status)) return 'failed';
  return 'pending';
}

/** Flatten whatever XentriPay returns into { id, status, checkoutUrl, amount, reference }. */
export function normalizeCollection(data) {
  const payload = data?.data ?? data ?? {};

  return {
    id: pick(payload, ['id', 'transactionId', 'transaction_id', 'txId', 'tx_id', 'paymentId', 'payment_id']),
    reference: pick(payload, ['reference', 'merchantReference', 'merchant_reference', 'tx_ref', 'orderId', 'order_id']),
    status: normalizeStatus(pick(payload, ['status', 'state', 'paymentStatus', 'payment_status', 'transactionStatus'])),
    checkoutUrl: pick(payload, ['checkoutUrl', 'checkout_url', 'paymentUrl', 'payment_url', 'redirectUrl', 'redirect_url', 'link', 'url']),
    amount: Number(pick(payload, ['amount', 'total']) ?? 0) || null,
    raw: payload,
  };
}

export function verifyWebhookSignature({ rawBody, signature, secret }) {
  if (!secret) return true;
  if (!signature) return false;

  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const given = String(signature).replace(/^sha256=/i, '').trim();

  try {
    return crypto.timingSafeEqual(Buffer.from(expected, 'utf8'), Buffer.from(given, 'utf8'));
  } catch {
    return false;
  }
}

export function createXentripayClient({ apiKey, environment = 'sandbox' }) {
  if (!apiKey) return null;

  const base = (
    environment === 'live'
      ? process.env.XENTRIPAY_LIVE_URL || DEFAULT_LIVE_URL
      : process.env.XENTRIPAY_SANDBOX_URL || DEFAULT_SANDBOX_URL
  ).replace(/\/$/, '');

  async function request(path, { method = 'GET', body } = {}) {
    const response = await fetch(`${base}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const text = await response.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { raw: text };
    }

    if (!response.ok) {
      const error = new Error(
        pick(data, ['message', 'error', 'errors.0.message']) || `XentriPay request failed (${response.status})`
      );
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  }

  return {
    environment,
    base,

    async initiateCollection({ amount, reference, description, customer, callbackUrl, returnUrl }) {
      const path = process.env.XENTRIPAY_COLLECT_PATH || '/collections';

      const data = await request(path, {
        method: 'POST',
        body: {
          amount,
          currency: 'RWF',
          reference,
          description,
          customerName: customer.name,
          customerEmail: customer.email,
          customerPhone: customer.phone,
          callbackUrl,
          returnUrl,
        },
      });

      return normalizeCollection(data);
    },

    async getCollection(id) {
      const path = (process.env.XENTRIPAY_STATUS_PATH || '/collections/{id}').replace('{id}', encodeURIComponent(id));
      return normalizeCollection(await request(path));
    },
  };
}
