import Stripe from 'stripe';
import { PaymentSettings } from '../models/index.js';
import { decrypt } from './crypto.js';

const SETTINGS_ID = 1;

export async function getSettingsRow() {
  const [row] = await PaymentSettings.findOrCreate({ where: { id: SETTINGS_ID } });
  return row;
}

export async function getStripeSecretKey() {
  const row = await getSettingsRow();
  return row.stripeSecretKeyEnc ? decrypt(row.stripeSecretKeyEnc) : null;
}

export async function getStripeWebhookSecret() {
  const row = await getSettingsRow();
  return row.stripeWebhookSecretEnc ? decrypt(row.stripeWebhookSecretEnc) : null;
}

export async function getStripeClient() {
  const secretKey = await getStripeSecretKey();
  if (!secretKey) return null;

  return new Stripe(secretKey);
}
