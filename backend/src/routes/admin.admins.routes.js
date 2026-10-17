import { Router } from 'express';
import { list, invite, resend, revoke, removeAdmin } from '../controllers/admin.admins.controller.js';

const router = Router();

router.get('/', list);
router.post('/invites', invite);
router.post('/invites/:id/resend', resend);
router.delete('/invites/:id', revoke);
router.delete('/:id', removeAdmin);

export default router;
