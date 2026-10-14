import { Router } from 'express';
import { presignProductImage, presignProgramVideo, presignHomeImage } from '../controllers/uploads.controller.js';
import { overview } from '../controllers/admin.dashboard.controller.js';
import { search } from '../controllers/admin.search.controller.js';
import { protect, adminOnly } from '../middleware/auth.js';
import adminProductRoutes from './admin.products.routes.js';
import adminOrderRoutes from './admin.orders.routes.js';
import adminPostRoutes from './admin.posts.routes.js';
import adminProgramRoutes from './admin.programs.routes.js';
import adminSettingsRoutes from './admin.settings.routes.js';
import adminCategoryRoutes from './admin.categories.routes.js';
import adminUserRoutes from './admin.users.routes.js';
import adminHomeRoutes from './admin.home.routes.js';
import adminMessageRoutes from './admin.messages.routes.js';
import adminSubscriberRoutes from './admin.subscribers.routes.js';
import adminBookingRoutes from './admin.bookings.routes.js';

const router = Router();

router.use(protect, adminOnly);

router.get('/check', (req, res) => res.json({ data: { ok: true } }));
router.get('/dashboard', overview);
router.get('/search', search);
router.post('/uploads/presign', presignProductImage);
router.post('/uploads/presign-video', presignProgramVideo);
router.post('/uploads/presign-home', presignHomeImage);
router.use('/products', adminProductRoutes);
router.use('/orders', adminOrderRoutes);
router.use('/posts', adminPostRoutes);
router.use('/programs', adminProgramRoutes);
router.use('/settings', adminSettingsRoutes);
router.use('/categories', adminCategoryRoutes);
router.use('/users', adminUserRoutes);
router.use('/home', adminHomeRoutes);
router.use('/messages', adminMessageRoutes);
router.use('/subscribers', adminSubscriberRoutes);
router.use('/bookings', adminBookingRoutes);

export default router;
