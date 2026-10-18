import { Router } from 'express';
import { list, detail, register, status, qr } from '../controllers/events.controller.js';
import { orderLimiter, paymentStatusLimiter } from '../middleware/security.js';

const router = Router();

router.get('/', list);
router.get('/registrations/:token', paymentStatusLimiter, status);
router.get('/tickets/:token/qr.png', qr);
router.get('/:slug', detail);
router.post('/:slug/register', orderLimiter, register);

export default router;
