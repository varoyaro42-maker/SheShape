import { Router } from 'express';
import { prepare, receiveFile } from '../controllers/uploads.controller.js';
import { overview } from '../controllers/admin.dashboard.controller.js';
import { search } from '../controllers/admin.search.controller.js';
import { protect, adminOnly } from '../middleware/auth.js';
import { auditAdminWrites } from '../utils/audit.js';
import { activity, activityPeople } from '../controllers/admin.activity.controller.js';
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
import adminAdminRoutes from './admin.admins.routes.js';
import adminEventRoutes from './admin.events.routes.js';
import adminPayoutRoutes from './admin.payouts.routes.js';

const router = Router();

router.use(protect, adminOnly, auditAdminWrites);

router.get('/check', (req, res) => res.json({ data: { ok: true } }));
router.get('/dashboard', overview);
router.get('/search', search);
router.get('/activity', activity);
router.get('/activity/people', activityPeople);
router.post('/uploads/prepare', prepare(['product', 'home', 'video']));
router.post('/uploads/file', receiveFile(['product', 'home', 'video']));
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
router.use('/admins', adminAdminRoutes);
router.use('/events', adminEventRoutes);
router.use('/payouts', adminPayoutRoutes);

export default router;
