import { Router } from 'express'
import { list, counts, detail, reply } from '../controllers/admin.messages.controller.js'

const router = Router()

router.get('/', list)
router.get('/counts', counts)
router.get('/:id', detail)
router.post('/:id/reply', reply)

export default router
