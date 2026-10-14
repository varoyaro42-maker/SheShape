import { Router } from 'express'
import {
  list,
  detail,
  create,
  update,
  remove,
  attachImage,
  updateImage,
  detachImage,
  reorderImages
} from '../controllers/admin.products.controller.js'

const router = Router()

router.route('/').get(list).post(create)
router.route('/:id').get(detail).patch(update).delete(remove)
router.patch('/:id/images/order', reorderImages)
router.post('/:id/images', attachImage)
router.patch('/:id/images/:imageId', updateImage)
router.delete('/:id/images/:imageId', detachImage)

export default router
