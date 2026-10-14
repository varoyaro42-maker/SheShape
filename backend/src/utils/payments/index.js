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

/** What the storefront may offer at checkout. Never includes secrets. */
export async function getPublicPaymentMethods() {
  const row = await getSettingsRow();

  return {
    cod: true,
    momo: momoReady(row) ? { number: row.momoNumber, name: row.momoName || 'She Shape' } : null,
    xentripay: xentripayReady(row) ? { environment: row.xentripayEnvironment } : null,
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
    hasXentripayApiKey: Boolean(row.xentripayApiKeyEnc),
    hasXentripayWebhookSecret: Boolean(row.xentripayWebhookSecretEnc),
    payoutNote: row.payoutNote ?? '',
  };
}
