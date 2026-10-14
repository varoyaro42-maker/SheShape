import { Router } from 'express';
import { getPublishableKey } from '../controllers/payments.controller.js';

const router = Router();

router.get('/stripe-key', getPublishableKey);

export default router;
