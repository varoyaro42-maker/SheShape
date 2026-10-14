import { Router } from 'express'
import { getHomeContent, updateHomeContent } from '../controllers/admin.home.controller.js'

const router = Router()

router.get('/', getHomeContent)
router.put('/', updateHomeContent)

export default router
