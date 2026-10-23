import { Router } from 'express'
import { list, create } from '../controllers/admin.categories.controller.js'

const router = Router()

router.route('/').get(list).post(create)

export default router
