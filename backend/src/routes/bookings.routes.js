import { Router } from 'express'
import { createBooking, listMyBookings } from '../controllers/bookings.controller.js'
import { protect, optionalAuth } from '../middleware/auth.js'
import { bookingLimiter } from '../middleware/security.js'

const router = Router()

router.post('/', bookingLimiter, optionalAuth, createBooking)
router.get('/my', protect, listMyBookings)

export default router
