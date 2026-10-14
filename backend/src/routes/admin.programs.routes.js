import { Router } from 'express'
import {
  list,
  detail,
  create,
  update,
  remove,
  attachVideo,
  detachVideo,
  reorderVideos
} from '../controllers/admin.programs.controller.js'

const router = Router()

router.route('/').get(list).post(create)
router.route('/:id').get(detail).patch(update).delete(remove)
router.patch('/:id/videos/order', reorderVideos)
router.post('/:id/videos', attachVideo)
router.delete('/:id/videos/:videoId', detachVideo)

export default router
