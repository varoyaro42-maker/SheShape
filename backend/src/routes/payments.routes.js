import { Router } from 'express';
import { getMethods, orderPaymentStatus } from '../controllers/payments.controller.js';
import { optionalAuth } from '../middleware/auth.js';

const router = Router();

router.get('/methods', getMethods);
router.get('/orders/:orderNumber', optionalAuth, orderPaymentStatus);

export default router;
