import { Router } from 'express'
import { subscribe, confirm, unsubscribe } from '../controllers/newsletter.controller.js'
import { newsletterLimiter } from '../middleware/security.js'

const router = Router()

router.post('/', newsletterLimiter, subscribe)
router.get('/confirm/:token', confirm)
router.get('/unsubscribe/:token', unsubscribe)

export default router
