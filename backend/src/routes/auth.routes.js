import { Router } from 'express';
import {
  register,
  login,
  logout,
  me,
  verifyEmail,
  resendOtp,
  forgotPassword,
  resetPassword,
  changePassword,
} from '../controllers/auth.controller.js';
import { protect, optionalAuth } from '../middleware/auth.js';
import { authLimiter } from '../middleware/security.js';
import { lookup as inviteLookup, accept as inviteAccept } from '../controllers/invites.controller.js';

const router = Router();

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/logout', optionalAuth, logout);
router.get('/me', optionalAuth, me);

router.post('/verify-email', authLimiter, verifyEmail);
router.post('/resend-otp', authLimiter, resendOtp);
router.post('/forgot-password', authLimiter, forgotPassword);
router.post('/reset-password', authLimiter, resetPassword);
router.post('/change-password', protect, changePassword);
router.get('/invites/:token', authLimiter, inviteLookup);
router.post('/invites/:token/accept', authLimiter, inviteAccept);

export default router;
