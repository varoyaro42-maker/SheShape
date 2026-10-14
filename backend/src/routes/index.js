import { Router } from 'express'
import { sequelize } from '../db.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import productRoutes from './products.routes.js'
import authRoutes from './auth.routes.js'
import orderRoutes from './orders.routes.js'
import postRoutes from './posts.routes.js'
import programRoutes from './programs.routes.js'
import userRoutes from './users.routes.js'
import paymentRoutes from './payments.routes.js'
import adminRoutes from './admin.routes.js'
import homeRoutes from './home.routes.js'
import contactRoutes from './contact.routes.js'

const router = Router()

router.get('/health', asyncHandler(async (req, res) => {
  await sequelize.authenticate()
  res.json({
    status: 'ok',
    database: 'connected',
    timestamp: new Date().toISOString()
  })
}))

router.use('/products', productRoutes)
router.use('/auth', authRoutes)
router.use('/orders', orderRoutes)
router.use('/posts', postRoutes)
router.use('/programs', programRoutes)
router.use('/users', userRoutes)
router.use('/payments', paymentRoutes)
router.use('/home-content', homeRoutes)
router.use('/contact', contactRoutes)
router.use('/admin', adminRoutes)

export default router
