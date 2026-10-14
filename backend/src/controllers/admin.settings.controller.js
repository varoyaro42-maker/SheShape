import { asyncHandler } from '../utils/asyncHandler.js';
import { getSettingsRow } from '../utils/stripe.js';
import { encrypt } from '../utils/crypto.js';

export const getSettings = asyncHandler(async (req, res) => {
  const row = await getSettingsRow();

  res.json({
    data: {
      stripePublishableKey: row.stripePublishableKey ?? '',
      payoutNote: row.payoutNote ?? '',
      hasSecretKey: Boolean(row.stripeSecretKeyEnc),
      hasWebhookSecret: Boolean(row.stripeWebhookSecretEnc),
    },
  });
});

export const updateSettings = asyncHandler(async (req, res) => {
  const row = await getSettingsRow();
  const { stripeSecretKey, stripePublishableKey, stripeWebhookSecret, payoutNote } = req.body ?? {};

  if (typeof stripeSecretKey === 'string' && stripeSecretKey.trim()) {
    row.stripeSecretKeyEnc = encrypt(stripeSecretKey.trim());
  }

  if (typeof stripeWebhookSecret === 'string' && stripeWebhookSecret.trim()) {
    row.stripeWebhookSecretEnc = encrypt(stripeWebhookSecret.trim());
  }

  if (typeof stripePublishableKey === 'string') {
    row.stripePublishableKey = stripePublishableKey.trim() || null;
  }

  if (typeof payoutNote === 'string') {
    row.payoutNote = payoutNote.trim() || null;
  }

  await row.save();

  res.json({
    data: {
      stripePublishableKey: row.stripePublishableKey ?? '',
      payoutNote: row.payoutNote ?? '',
      hasSecretKey: Boolean(row.stripeSecretKeyEnc),
      hasWebhookSecret: Boolean(row.stripeWebhookSecretEnc),
    },
  });
});
