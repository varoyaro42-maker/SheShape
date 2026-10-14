import { Router } from 'express';
import { createOrder, listMyOrders, getOrderByNumber } from '../controllers/orders.controller.js';
import { protect, optionalAuth } from '../middleware/auth.js';

const router = Router();

router.post('/', protect, createOrder);
router.get('/my', protect, listMyOrders);
router.get('/:orderNumber', optionalAuth, getOrderByNumber);

export default router;
