import { User } from '../models/index.js';
import { HttpError } from '../utils/httpError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { COOKIE_NAME, verifyToken, clearAuthCookie } from '../utils/token.js';

const readUserFromCookie = async (req) => {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return null;
  const payload = verifyToken(token);
  return User.findByPk(payload.sub);
};

export const protect = asyncHandler(async (req, res, next) => {
  if (!req.cookies?.[COOKIE_NAME]) {
    throw new HttpError(401, 'You need to be signed in');
  }

  let user;
  try {
    user = await readUserFromCookie(req);
  } catch {
    clearAuthCookie(res);
    throw new HttpError(401, 'Your session has expired, please sign in again');
  }

  if (!user) {
    clearAuthCookie(res);
    throw new HttpError(401, 'This account no longer exists');
  }

  req.user = user;
  next();
});

export const optionalAuth = asyncHandler(async (req, res, next) => {
  try {
    req.user = await readUserFromCookie(req);
  } catch {
    req.user = null;
  }
  next();
});

export const adminOnly = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return next(new HttpError(403, 'This area is for administrators only'));
  }
  next();
};
