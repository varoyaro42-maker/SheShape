import { Router } from 'express'
import { list, counts, detail, updateStatus } from '../controllers/admin.orders.controller.js'

const router = Router()

router.get('/', list)
router.get('/counts', counts)
router.get('/:id', detail)
router.patch('/:id/status', updateStatus)

export default router
