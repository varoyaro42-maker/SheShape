import { Router } from 'express';
import { updateAvatar } from '../controllers/users.controller.js';
import { prepare, receiveFile } from '../controllers/uploads.controller.js';
import { protect } from '../middleware/auth.js';

const router = Router();

router.use(protect);

router.post('/me/avatar/prepare', prepare(['avatar']));
router.post('/me/avatar/file', receiveFile(['avatar']));
router.patch('/me/avatar', updateAvatar);

export default router;
