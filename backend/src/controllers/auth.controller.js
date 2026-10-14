import { User } from '../models/index.js';
import { HttpError } from '../utils/httpError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  signToken,
  setAuthCookie,
  clearAuthCookie,
  PENDING_COOKIE_NAME,
  signPendingToken,
  verifyPendingToken,
  setPendingCookie,
  clearPendingCookie,
} from '../utils/token.js';
import { createAndSendOtp, consumeOtp } from '../utils/otp.js';

async function readPendingUser(req) {
  const token = req.cookies?.[PENDING_COOKIE_NAME];
  if (!token) throw new HttpError(400, 'Your verification session has expired. Please log in again.');

  let payload;
  try {
    payload = verifyPendingToken(token);
  } catch {
    throw new HttpError(400, 'Your verification session has expired. Please log in again.');
  }

  const user = await User.findByPk(payload.sub);
  if (!user) throw new HttpError(400, 'This account no longer exists');

  return { user, purpose: payload.purpose };
}

async function startVerification(res, user) {
  await createAndSendOtp(user, 'verify_email');
  setPendingCookie(res, signPendingToken(user, 'verify_email'));
}

export const register = asyncHandler(async (req, res) => {
  const { name, email, phone, password } = req.body;

  const user = await User.create({ name, email, phone, password, isVerified: false });

  await startVerification(res, user);

  res.status(201).json({ data: { email: user.email, pendingVerification: true } });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new HttpError(400, 'Email and password are required');
  }

  const user = await User.scope('withPassword').findOne({
    where: { email: String(email).trim().toLowerCase() },
  });

  if (!user || !(await user.checkPassword(password))) {
    throw new HttpError(401, 'Email or password is incorrect');
  }

  if (user.role !== 'admin' && !user.isVerified) {
    await startVerification(res, user);
    return res.json({ data: { email: user.email, pendingVerification: true } });
  }

  setAuthCookie(res, signToken(user));
  res.json({ data: user });
});

export const verifyEmail = asyncHandler(async (req, res) => {
  const { user, purpose } = await readPendingUser(req);

  if (purpose !== 'verify_email') {
    throw new HttpError(400, 'Invalid verification request');
  }

  await consumeOtp(user, 'verify_email', req.body?.code);

  user.isVerified = true;
  await user.save();

  clearPendingCookie(res);
  setAuthCookie(res, signToken(user));
  res.json({ data: user });
});

export const resendOtp = asyncHandler(async (req, res) => {
  const { user, purpose } = await readPendingUser(req);

  await createAndSendOtp(user, purpose);
  setPendingCookie(res, signPendingToken(user, purpose));

  res.status(204).end();
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const email = String(req.body?.email ?? '').trim().toLowerCase();

  const user = email ? await User.findOne({ where: { email } }) : null;

  if (user) {
    await createAndSendOtp(user, 'reset_password');
  }

  res.status(204).end();
});

export const resetPassword = asyncHandler(async (req, res) => {
  const email = String(req.body?.email ?? '').trim().toLowerCase();
  const { code, newPassword } = req.body ?? {};

  const user = await User.findOne({ where: { email } });
  if (!user) {
    throw new HttpError(400, 'That code is incorrect.');
  }

  await consumeOtp(user, 'reset_password', code);

  user.password = newPassword;
  await user.save({ fields: ['passwordHash'] });

  res.status(204).end();
});

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body ?? {};

  const user = await User.scope('withPassword').findByPk(req.user.id);

  if (!user || !(await user.checkPassword(currentPassword))) {
    throw new HttpError(401, 'Your current password is incorrect');
  }

  user.password = newPassword;
  await user.save({ fields: ['passwordHash'] });

  res.status(204).end();
});

export const logout = (req, res) => {
  clearAuthCookie(res);
  res.status(204).end();
};

export const me = (req, res) => {
  res.json({ data: req.user ?? null });
};
