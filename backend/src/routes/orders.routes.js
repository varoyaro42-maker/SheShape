import { Router } from 'express';
import { createOrder, listMyOrders, getOrderByNumber } from '../controllers/orders.controller.js';
import { protect, optionalAuth } from '../middleware/auth.js';
import { orderLimiter, paymentStatusLimiter } from '../middleware/security.js';

const router = Router();

router.post('/', orderLimiter, protect, createOrder);
router.get('/my', protect, listMyOrders);
router.get('/:orderNumber', paymentStatusLimiter, optionalAuth, getOrderByNumber);

export default router;
