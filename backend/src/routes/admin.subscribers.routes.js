import { Router } from 'express'
import { list, counts, exportCsv, remove } from '../controllers/admin.subscribers.controller.js'

const router = Router()

router.get('/', list)
router.get('/counts', counts)
router.get('/export.csv', exportCsv)
router.delete('/:id', remove)

export default router
