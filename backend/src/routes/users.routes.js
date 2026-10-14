import { Router } from 'express';
import { updateAvatar } from '../controllers/users.controller.js';
import { presignAvatarImage } from '../controllers/uploads.controller.js';
import { protect } from '../middleware/auth.js';

const router = Router();

router.use(protect);

router.post('/me/avatar/presign', presignAvatarImage);
router.patch('/me/avatar', updateAvatar);

export default router;
