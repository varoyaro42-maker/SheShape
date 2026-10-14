import { PaymentSettings } from '../../models/index.js';
import { decrypt } from '../crypto.js';
import { createXentripayClient } from './xentripay.js';

const SETTINGS_ID = 1;

export async function getSettingsRow() {
  const [row] = await PaymentSettings.findOrCreate({ where: { id: SETTINGS_ID } });
  return row;
}

export function xentripayReady(row) {
  return Boolean(row.xentripayEnabled && row.xentripayApiKeyEnc);
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
        ? { provider: 'manual', number: row.momoNumber, name: row.momoName || 'She Shape' }
        : null,
    card: online ? { provider: 'xentripay' } : null,
  };
}

export async function getXentripayClient() {
  const row = await getSettingsRow();
  if (!xentripayReady(row)) return null;

  return createXentripayClient({
    apiKey: decrypt(row.xentripayApiKeyEnc),
    environment: row.xentripayEnvironment,
  });
}

export async function getXentripayWebhookSecret() {
  const row = await getSettingsRow();
  return row.xentripayWebhookSecretEnc ? decrypt(row.xentripayWebhookSecretEnc) : null;
}

export function publicSettings(row) {
  return {
    momoNumber: row.momoNumber ?? '',
    momoName: row.momoName ?? '',
    xentripayEnabled: Boolean(row.xentripayEnabled),
    xentripayEnvironment: row.xentripayEnvironment,
    xentripayChargesIncluded: row.xentripayChargesIncluded !== false,
    hasXentripayApiKey: Boolean(row.xentripayApiKeyEnc),
    hasXentripayWebhookSecret: Boolean(row.xentripayWebhookSecretEnc),
    payoutNote: row.payoutNote ?? '',
  };
}
