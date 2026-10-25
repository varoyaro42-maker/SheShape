import crypto from 'node:crypto';
import { normalizePhone } from '../phone.js';

/**
 * XentriPay Collections API (per the merchant integration pack, Oct 2026).
 *
 * - Base URLs: production https://xentripay.com, test https://merchant.test.xentripay.com
 * - Auth: X-XENTRIPAY-KEY header
 * - POST /api/collections/initiate with pmethod "momo" (push prompt to the
 *   customer's phone, no redirect) or "cc" (card; response carries a url to
 *   redirect the customer to).
 * - GET /api/collections/status/{customerRef|refid} -> PENDING | SUCCESS | FAILED
 * - Webhooks: X-Xentripay-Signature: sha256=<hmac-sha256 hex of raw body>
 */
const LIVE_URL = 'https://xentripay.com';
const SANDBOX_URL = 'https://merchant.test.xentripay.com';

export const MIN_AMOUNT_RWF = 100;

const PAID = new Set(['SUCCESS', 'SUCCESSFUL', 'COMPLETED']);
const FAILED = new Set(['FAILED', 'FAILURE', 'DECLINED', 'CANCELLED', 'CANCELED', 'EXPIRED', 'REVERSED']);

export function normalizeStatus(value) {
  const status = String(value ?? '').trim().toUpperCase();
  if (PAID.has(status)) return 'paid';
  if (FAILED.has(status)) return 'failed';
  return 'pending';
}

/** XentriPay wants both formats: msisdn "2507..." and cnumber "07..." (10 digits). */
export function phoneParts(phone) {
  const digits = String(normalizePhone(phone) ?? '').replace(/\D/g, '');
  return { msisdn: digits, cnumber: `0${digits.slice(3)}` };
}

export function verifyWebhookSignature({ rawBody, signature, secret }) {
  if (!secret || !signature) return false;

  const expected = `sha256=${crypto.createHmac('sha256', secret).update(rawBody).digest('hex')}`;
  const given = String(signature).trim();
  const normalized = given.toLowerCase().startsWith('sha256=') ? given : `sha256=${given}`;

  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(normalized, 'utf8');
  if (a.length !== b.length) return false;

  return crypto.timingSafeEqual(a, b);
}

/** Every reference-like value in a webhook payload, for matching to an order or payout. */
export function webhookReferences(payload) {
  const data = payload?.data ?? {};
  return ['customerRef', 'customerReference', 'reference', 'refid', 'rid', 'tid', 'internalRef', 'id']
    .map((key) => data[key])
    .filter((value) => value !== undefined && value !== null && value !== '')
    .map(String);
}

export function createXentripayClient({ apiKey, environment = 'sandbox' }) {
  if (!apiKey) return null;

  const base = (
    environment === 'live'
      ? process.env.XENTRIPAY_LIVE_URL || LIVE_URL
      : process.env.XENTRIPAY_SANDBOX_URL || SANDBOX_URL
  ).replace(/\/$/, '');

  async function request(path, { method = 'GET', body } = {}) {
    const response = await fetch(`${base}${path}`, {
      method,
      headers: {
        'X-XENTRIPAY-KEY': apiKey,
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
      const error = new Error(data?.message || data?.reply || `XentriPay request failed (${response.status})`);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  }

  return {
    environment,
    base,

    /**
     * Start a collection. `method` is "momo" or "card". For momo the customer
     * gets a prompt on their phone; for card the result carries a checkoutUrl.
     */
    async initiateCollection({
      amount,
      reference,
      description,
      customer,
      method = 'momo',
      redirectUrl,
      returnUrl,
      chargesIncluded = true,
    }) {
      const { msisdn, cnumber } = phoneParts(customer.phone);

      const body = {
        email: customer.email,
        cname: customer.name,
        amount: Math.round(amount),
        cnumber,
        msisdn,
        currency: 'RWF',
        pmethod: method === 'card' ? 'cc' : 'momo',
        chargesIncluded: Boolean(chargesIncluded),
        customerRef: reference,
        details: description,
      };

      if (method === 'card') {
        body.redirecturl = redirectUrl;
        body.returl = returnUrl;
      }

      const data = await request('/api/collections/initiate', { method: 'POST', body });

      const accepted = Number(data?.success) === 1 && (data?.retcode === undefined || Number(data.retcode) === 0);
      if (!accepted) {
        const error = new Error(data?.reply || data?.message || 'XentriPay did not accept the payment request');
        error.retcode = data?.retcode;
        error.data = data;
        throw error;
      }

      // The sandbox answers momo requests with url: " ".
      const checkoutUrl = typeof data.url === 'string' ? data.url.trim() : '';

      return {
        reference: data.refid ? String(data.refid) : null,
        transactionId: data.tid ? String(data.tid) : null,
        checkoutUrl: checkoutUrl || null,
        message: data.reply || '',
      };
    },

    /** `reference` may be our customerRef or XentriPay's refid. */
    async getCollectionStatus(reference) {
      const data = await request(`/api/collections/status/${encodeURIComponent(reference)}`);
      return {
        status: normalizeStatus(data?.status),
        reference: data?.rid ?? data?.refid ?? null,
        customerRef: data?.customerRef ?? null,
        updatedAt: data?.updatedAt ?? null,
        raw: data,
      };
    },

    /**
     * Send money out of the wallet. XentriPay holds it as PENDING until the
     * business confirms the OTP it sends to the registered email/phone.
     */
    async initiatePayout({ reference, providerId, account, name, amount }) {
      const data = await request('/api/payment-requests', {
        method: 'POST',
        body: {
          customerReference: reference,
          telecomProviderId: String(providerId),
          msisdn: account,
          name,
          transactionType: 'PAYOUT',
          currency: 'RWF',
          amount: Math.round(amount),
        },
      });

      return {
        status: normalizePayoutStatus(data?.status),
        message: data?.statusMessage || '',
        id: data?.id !== undefined && data?.id !== null ? String(data.id) : null,
        internalRef: data?.internalRef ?? null,
        charge: data?.txnCharge !== undefined && data?.txnCharge !== null ? Math.round(Number(data.txnCharge)) : null,
        validatedName: data?.validatedAccountName ?? null,
        raw: data,
      };
    },

    /** Status from the provider, looked up by our customerReference. */
    async getPayoutStatus(reference) {
      const data = await request(`/api/payment-requests/check-status?customerRef=${encodeURIComponent(reference)}`);
      const inner = data?.data ?? {};
      return {
        status: normalizePayoutStatus(inner.status ?? data?.status),
        message: data?.message || '',
        raw: data,
      };
    },
  };
}

/** Payout statuses: PENDING, then COMPLETED (provider) / SUCCESSFUL (XentriPay), FAILED or REVERSED. */
export function normalizePayoutStatus(value) {
  const status = String(value ?? '').trim().toUpperCase();
  if (['COMPLETED', 'SUCCESSFUL', 'SUCCESS'].includes(status)) return 'successful';
  if (['FAILED', 'FAILURE', 'DECLINED', 'CANCELLED', 'CANCELED', 'REJECTED'].includes(status)) return 'failed';
  if (status === 'REVERSED') return 'reversed';
  return 'pending';
}

/** telecomProviderId values from the API documentation, section 6. */
export const PAYOUT_PROVIDERS = [
  { id: '63510', name: 'MTN Mobile Money', type: 'momo' },
  { id: '63514', name: 'Airtel Money', type: 'momo' },
  { id: '63509', name: 'SPENN', type: 'momo' },
  { id: '040', name: 'Bank of Kigali', type: 'bank' },
  { id: '400', name: 'Banque Populaire du Rwanda', type: 'bank' },
  { id: '192', name: 'Equity Bank', type: 'bank' },
  { id: '100', name: 'Ecobank Rwanda', type: 'bank' },
  { id: '115', name: 'Access Bank Rwanda', type: 'bank' },
  { id: '070', name: 'Guaranty Trust Bank (Rwanda)', type: 'bank' },
  { id: '010', name: 'I&M Bank (Investment and Mortgage Bank)', type: 'bank' },
  { id: '025', name: 'NCBA (National Commercial Bank of Africa)', type: 'bank' },
  { id: '145', name: 'Urwego Opportunity Bank', type: 'bank' },
  { id: '800', name: 'Zigama CSS', type: 'bank' },
  { id: '900', name: 'Bank of Africa Rwanda', type: 'bank' },
  { id: '950', name: 'Unguka Bank', type: 'bank' },
  { id: '951', name: 'Banque Nationale du Rwanda', type: 'bank' },
];
