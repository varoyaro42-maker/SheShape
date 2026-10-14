import bcrypt from 'bcryptjs';
import { Op } from 'sequelize';
import { OtpCode } from '../models/index.js';
import { HttpError } from './httpError.js';
import { sendOtpEmail } from './emails.js';

const EXPIRES_MINUTES = 10;
const MAX_ATTEMPTS = 5;

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function createAndSendOtp(user, purpose) {
  await OtpCode.destroy({ where: { userId: user.id, purpose, consumedAt: null } });

  const code = generateCode();
  const codeHash = await bcrypt.hash(code, 10);
  const expiresAt = new Date(Date.now() + EXPIRES_MINUTES * 60 * 1000);

  await OtpCode.create({ userId: user.id, purpose, codeHash, expiresAt });

  await sendOtpEmail({ to: user.email, purpose, code, expiresMinutes: EXPIRES_MINUTES });
}

export async function consumeOtp(user, purpose, code) {
  const otp = await OtpCode.findOne({
    where: { userId: user.id, purpose, consumedAt: null, expiresAt: { [Op.gt]: new Date() } },
    order: [['createdAt', 'DESC']],
  });

  if (!otp) {
    throw new HttpError(400, 'That code has expired. Request a new one.');
  }

  if (otp.attempts >= MAX_ATTEMPTS) {
    throw new HttpError(400, 'Too many incorrect attempts. Request a new code.');
  }

  const isValid = await bcrypt.compare(String(code ?? ''), otp.codeHash);

  if (!isValid) {
    await otp.increment('attempts');
    throw new HttpError(400, 'That code is incorrect.');
  }

  otp.consumedAt = new Date();
  await otp.save();
}
