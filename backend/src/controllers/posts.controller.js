import { Op } from 'sequelize';
import { asyncHandler } from '../utils/asyncHandler.js';
import { HttpError } from '../utils/httpError.js';
import { Post, User } from '../models/index.js';

const MAX_LIMIT = 24;

const PUBLIC_FIELDS = [
  'id',
  'title',
  'slug',
  'excerpt',
  'coverImage',
  'publishedAt',
];

const withAuthor = {
  model: User,
  as: 'author',
  attributes: ['id', 'name'],
};

// Built per request. As a module-level constant the `new Date()` would freeze at
// server start, so a scheduled post would never become visible until a restart.
const published = () => ({
  isPublished: true,
  publishedAt: { [Op.lte]: new Date() },
});

export const list = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(req.query.limit) || 9));
  const where = { ...published() };

  const search = String(req.query.search || '').trim();

  if (search) {
    where[Op.or] = [
      { title: { [Op.like]: `%${search}%` } },
      { excerpt: { [Op.like]: `%${search}%` } },
    ];
  }

  const { rows, count } = await Post.findAndCountAll({
    where,
    attributes: PUBLIC_FIELDS,
    include: [withAuthor],
    order: [['publishedAt', 'DESC']],
    limit,
    offset: (page - 1) * limit,
    distinct: true,
  });

  res.json({
    data: rows,
    meta: { page, limit, total: count, pages: Math.ceil(count / limit) || 1 },
  });
});

export const detail = asyncHandler(async (req, res) => {
  const post = await Post.findOne({
    where: { slug: req.params.slug, ...published() },
    attributes: [...PUBLIC_FIELDS, 'body'],
    include: [withAuthor],
  });

  if (!post) throw new HttpError(404, 'Post not found');

  const related = await Post.findAll({
    where: { ...published(), id: { [Op.ne]: post.id } },
    attributes: PUBLIC_FIELDS,
    order: [['publishedAt', 'DESC']],
    limit: 3,
  });

  res.json({ data: post, related });
});
