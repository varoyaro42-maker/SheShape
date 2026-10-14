import { asyncHandler } from '../utils/asyncHandler.js';
import { HttpError } from '../utils/httpError.js';
import { getSettingsRow, publicSettings } from '../utils/payments/index.js';
import { encrypt } from '../utils/crypto.js';
import { XENTRIPAY_ENVIRONMENTS } from '../models/index.js';
import { PHONE_PATTERN, normalizePhone } from '../utils/phone.js';

export const getSettings = asyncHandler(async (req, res) => {
  const row = await getSettingsRow();
  res.json({ data: publicSettings(row) });
});

export const updateSettings = asyncHandler(async (req, res) => {
  const row = await getSettingsRow();
  const body = req.body ?? {};

  if (typeof body.momoNumber === 'string') {
    const trimmed = body.momoNumber.trim();
    if (trimmed) {
      const normalized = normalizePhone(trimmed);
      if (!PHONE_PATTERN.test(normalized)) {
        throw new HttpError(400, 'Enter a valid Rwandan mobile money number.', [
          { field: 'momoNumber', message: 'Enter a valid Rwandan phone number.' },
        ]);
      }
      row.momoNumber = normalized;
    } else {
      row.momoNumber = null;
    }
  }

  if (typeof body.momoName === 'string') row.momoName = body.momoName.trim() || null;

  if (typeof body.xentripayApiKey === 'string' && body.xentripayApiKey.trim()) {
    row.xentripayApiKeyEnc = encrypt(body.xentripayApiKey.trim());
  }

  if (typeof body.xentripayWebhookSecret === 'string' && body.xentripayWebhookSecret.trim()) {
    row.xentripayWebhookSecretEnc = encrypt(body.xentripayWebhookSecret.trim());
  }

  if (body.clearXentripay === true) {
    row.xentripayApiKeyEnc = null;
    row.xentripayWebhookSecretEnc = null;
    row.xentripayEnabled = false;
  }

  if (typeof body.xentripayEnvironment === 'string') {
    if (!XENTRIPAY_ENVIRONMENTS.includes(body.xentripayEnvironment)) {
      throw new HttpError(400, 'Environment must be sandbox or live.');
    }
    row.xentripayEnvironment = body.xentripayEnvironment;
  }

  if (typeof body.xentripayEnabled === 'boolean') {
    if (body.xentripayEnabled && !row.xentripayApiKeyEnc) {
      throw new HttpError(400, 'Save a XentriPay API key before turning online payments on.', [
        { field: 'xentripayApiKey', message: 'API key is required.' },
      ]);
    }
    row.xentripayEnabled = body.xentripayEnabled;
  }

  if (typeof body.payoutNote === 'string') row.payoutNote = body.payoutNote.trim() || null;

  await row.save();

  res.json({ data: publicSettings(row) });
});
