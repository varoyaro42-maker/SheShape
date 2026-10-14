import { Router } from 'express';
import {
  list,
  detail,
  create,
  update,
  remove,
} from '../controllers/admin.posts.controller.js';

const router = Router();

router.route('/').get(list).post(create);
router.route('/:id').get(detail).patch(update).delete(remove);

export default router;
