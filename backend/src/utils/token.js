import jwt from 'jsonwebtoken';

export const COOKIE_NAME = 'sheshape_token';
export const PENDING_COOKIE_NAME = 'sheshape_pending';

const EXPIRES_DAYS = Number(process.env.JWT_EXPIRES_DAYS ?? 7);
const PENDING_EXPIRES_MINUTES = 15;

const baseCookieOptions = () => ({
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
});

export const signToken = (user) =>
  jwt.sign({ sub: user.id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: `${EXPIRES_DAYS}d`,
  });

export const verifyToken = (token) => jwt.verify(token, process.env.JWT_SECRET);

export const setAuthCookie = (res, token) =>
  res.cookie(COOKIE_NAME, token, {
    ...baseCookieOptions(),
    maxAge: EXPIRES_DAYS * 24 * 60 * 60 * 1000,
  });

export const clearAuthCookie = (res) => res.clearCookie(COOKIE_NAME, baseCookieOptions());

export const signPendingToken = (user, purpose) =>
  jwt.sign({ sub: user.id, purpose }, process.env.JWT_SECRET, {
    expiresIn: `${PENDING_EXPIRES_MINUTES}m`,
  });

export const verifyPendingToken = (token) => jwt.verify(token, process.env.JWT_SECRET);

export const setPendingCookie = (res, token) =>
  res.cookie(PENDING_COOKIE_NAME, token, {
    ...baseCookieOptions(),
    maxAge: PENDING_EXPIRES_MINUTES * 60 * 1000,
  });

export const clearPendingCookie = (res) => res.clearCookie(PENDING_COOKIE_NAME, baseCookieOptions());
