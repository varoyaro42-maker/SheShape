import { Router } from 'express'
import { list, detail, remove } from '../controllers/admin.users.controller.js'

const router = Router()

router.get('/', list)
router.get('/:id', detail)
router.delete('/:id', remove)

export default router
