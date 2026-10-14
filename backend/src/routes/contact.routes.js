import { Router } from 'express'
import { sendContactMessage } from '../controllers/contact.controller.js'
import { contactLimiter } from '../middleware/security.js'

const router = Router()

router.post('/', contactLimiter, sendContactMessage)

export default router
