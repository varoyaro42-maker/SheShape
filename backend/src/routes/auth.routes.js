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

const router = Router();

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/logout', logout);
router.get('/me', optionalAuth, me);

router.post('/verify-email', authLimiter, verifyEmail);
router.post('/resend-otp', authLimiter, resendOtp);
router.post('/forgot-password', authLimiter, forgotPassword);
router.post('/reset-password', authLimiter, resetPassword);
router.post('/change-password', protect, changePassword);

export default router;
