import { Router } from 'express';
import * as c from '../controllers/admin.events.controller.js';

const router = Router();

router.get('/', c.list);
router.post('/', c.create);
router.get('/check-in/:token', c.checkInLookup);
router.post('/check-in/:token', c.checkIn);
router.get('/:id', c.detail);
router.put('/:id', c.update);
router.delete('/:id', c.remove);
router.post('/:id/duplicate', c.duplicate);
router.get('/:id/roster', c.roster);
router.get('/:id/export.csv', c.exportCsv);
router.get('/:id/registrations', c.registrations);
router.post('/:id/registrations', c.addRegistration);
router.get('/:id/registrations/:regId', c.registrationDetail);
router.put('/:id/registrations/:regId/activities', c.changeActivities);
router.post('/:id/registrations/:regId/cancel', c.cancel);
router.post('/:id/registrations/:regId/confirm', c.forceConfirm);
router.post('/:id/registrations/:regId/resend-ticket', c.resendTicket);
router.delete('/:id/registrations/:regId', c.erase);

export default router;
