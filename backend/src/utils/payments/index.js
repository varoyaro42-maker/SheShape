import { PaymentSettings } from '../../models/index.js';
import { decrypt } from '../crypto.js';
import { createXentripayClient } from './xentripay.js';

const SETTINGS_ID = 1;

export async function getSettingsRow() {
  const [row] = await PaymentSettings.findOrCreate({ where: { id: SETTINGS_ID } });
  return row;
}

/**
 * XentriPay credentials come from the admin screen (encrypted in the
 * database) or, until an admin saves a key there, from the environment:
 * XENTRIPAY_API_KEY, XENTRIPAY_WEBHOOK_SECRET, XENTRIPAY_ENVIRONMENT
 * (sandbox|live) and XENTRIPAY_ENABLED (true unless set to "false").
 */
export function xentripayConfig(row) {
  if (row.xentripayApiKeyEnc) {
    return {
      source: 'admin',
      apiKey: decrypt(row.xentripayApiKeyEnc),
      webhookSecret: row.xentripayWebhookSecretEnc ? decrypt(row.xentripayWebhookSecretEnc) : null,
      environment: row.xentripayEnvironment,
      enabled: Boolean(row.xentripayEnabled),
    };
  }

  const apiKey = (process.env.XENTRIPAY_API_KEY || '').trim();
  if (!apiKey) return null;

  return {
    source: 'env',
    apiKey,
    webhookSecret: (process.env.XENTRIPAY_WEBHOOK_SECRET || '').trim() || null,
    environment: process.env.XENTRIPAY_ENVIRONMENT === 'live' ? 'live' : 'sandbox',
    enabled: process.env.XENTRIPAY_ENABLED !== 'false',
  };
}

export function xentripayReady(row) {
  const config = xentripayConfig(row);
  return Boolean(config?.enabled && config.apiKey);
}

export function momoReady(row) {
  return Boolean(row.momoNumber);
}

/**
 * What the storefront may offer at checkout. Never includes secrets.
 * When XentriPay is on, mobile money goes through it (push prompt) and card
 * is available; otherwise mobile money falls back to the manual number.
 */
export async function getPublicPaymentMethods() {
  const row = await getSettingsRow();
  const online = xentripayReady(row);

  return {
    cod: true,
    momo: online
      ? { provider: 'xentripay' }
      : momoReady(row)
        ? { provider: 'manual', number: row.momoNumber, name: row.momoName || 'She Shape Wellness' }
        : null,
    card: online ? { provider: 'xentripay' } : null,
    // True when XentriPay adds its service fee on top of the order total.
    customerPaysFee: online && row.xentripayChargesIncluded !== true,
  };
}

export async function getXentripayClient() {
  const row = await getSettingsRow();
  if (!xentripayReady(row)) return null;

  const { apiKey, environment } = xentripayConfig(row);
  return createXentripayClient({ apiKey, environment });
}

export async function getXentripayWebhookSecret() {
  const row = await getSettingsRow();
  return xentripayConfig(row)?.webhookSecret ?? null;
}

export function publicSettings(row) {
  const config = xentripayConfig(row);

  return {
    momoNumber: row.momoNumber ?? '',
    momoName: row.momoName ?? '',
    xentripayEnabled: Boolean(config?.enabled),
    xentripayEnvironment: config?.environment ?? row.xentripayEnvironment,
    xentripayChargesIncluded: row.xentripayChargesIncluded === true,
    hasXentripayApiKey: Boolean(config?.apiKey),
    hasXentripayWebhookSecret: Boolean(config?.webhookSecret),
    // "env" means the server's environment variables are in use; saving a key in admin takes over.
    xentripaySource: config?.source ?? null,
    payoutNote: row.payoutNote ?? '',
  };
}
