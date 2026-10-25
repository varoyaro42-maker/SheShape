import { Router } from 'express';
import { create, list, received, refresh, summary } from '../controllers/admin.payouts.controller.js';

const router = Router();

router.get('/summary', summary);
router.get('/received', received);
router.get('/', list);
router.post('/', create);
router.post('/:id/refresh', refresh);

export default router;
