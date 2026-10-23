import { Router } from 'express'
import { getHomeContent } from '../controllers/home.controller.js'

const router = Router()

router.get('/', getHomeContent)

export default router
