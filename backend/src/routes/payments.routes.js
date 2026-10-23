import { Router } from 'express';
import { getMethods, orderPaymentStatus, retryPayment } from '../controllers/payments.controller.js';
import { optionalAuth } from '../middleware/auth.js';
import { orderLimiter, paymentStatusLimiter } from '../middleware/security.js';

const router = Router();

router.get('/methods', getMethods);
router.get('/orders/:orderNumber', paymentStatusLimiter, optionalAuth, orderPaymentStatus);
router.post('/orders/:orderNumber/retry', orderLimiter, optionalAuth, retryPayment);

export default router;
