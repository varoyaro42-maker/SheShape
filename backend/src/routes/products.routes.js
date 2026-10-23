import { Router } from 'express'
import { listProducts, getProductBySlug, listCategories } from '../controllers/products.controller.js'

const router = Router()

router.get('/', listProducts)
router.get('/categories', listCategories)
router.get('/:slug', getProductBySlug)

export default router
