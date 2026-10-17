import { Op } from 'sequelize';
import { asyncHandler } from '../utils/asyncHandler.js';
import { HttpError } from '../utils/httpError.js';
import { buildUniqueSlug } from '../utils/slug.js';
import { deleteImageByUrl } from '../utils/storage.js';
import { sendNewPostEmails } from '../utils/emails.js';
import { Post, User } from '../models/index.js';
import sequelize from '../db.js';

const MAX_LIMIT = 50;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const withAuthor = {
  model: User,
  as: 'author',
  attributes: ['id', 'name'],
};

const LIST_FIELDS = [
  'id',
  'title',
  'slug',
  'excerpt',
  'coverImage',
  'isPublished',
  'publishedAt',
  'updatedAt',
];

function invalid(field, message) {
  return new HttpError(400, message, [{ field, message }]);
}

function readString(body, field, { max, required }) {
  const raw = body[field];
  const value = typeof raw === 'string' ? raw.trim() : '';

  if (!value) {
    if (required) throw invalid(field, `${field} is required.`);
    return '';
  }

  if (max && value.length > max) {
    throw invalid(field, `${field} must be ${max} characters or fewer.`);
  }

  return value;
}

function readBoolean(body, field) {
  const raw = body[field];

  if (raw === undefined) return undefined;
  if (typeof raw === 'boolean') return raw;
  if (raw === 'true') return true;
  if (raw === 'false') return false;

  throw invalid(field, `${field} must be true or false.`);
}

function readDate(body, field) {
  const raw = body[field];

  if (raw === undefined || raw === null || raw === '') return null;

  const value = new Date(raw);

  if (Number.isNaN(value.getTime())) {
    throw invalid(field, 'Give a valid date and time.');
  }

  return value;
}

function readCover(body) {
  const raw = body.coverImage;

  if (raw === undefined) return undefined;
  if (raw === null || raw === '') return null;

  return String(raw).trim();
}

function buildExcerpt(body, fallbackBody) {
  const given = readString(body, 'excerpt', { max: 300, required: false });

  if (given) return given;

  const plain = fallbackBody.replace(/\s+/g, ' ').trim();

  if (plain.length <= 200) return plain;

  return `${plain.slice(0, 197).trimEnd()}...`;
}

function buildPayload(body, { partial }) {
  const has = (field) => Object.prototype.hasOwnProperty.call(body, field);
  const payload = {};

  if (!partial || has('title')) {
    payload.title = readString(body, 'title', { max: 180, required: true });
  }

  if (!partial || has('body')) {
    payload.body = readString(body, 'body', { required: false });
  }

  if (!partial || has('excerpt') || has('body')) {
    payload.excerpt = buildExcerpt(body, payload.body ?? '');
  }

  if (has('coverImage')) {
    payload.coverImage = readCover(body);
  }

  if (has('slug')) {
    payload.slug = readString(body, 'slug', { max: 200, required: true });
  }

  if (!partial || has('isPublished')) {
    const isPublished = readBoolean(body, 'isPublished');
    payload.isPublished = isPublished === undefined ? false : isPublished;
  }

  if (has('publishedAt')) {
    payload.publishedAt = readDate(body, 'publishedAt');
  }

  return payload;
}

function notifyReaders(post) {
  User.findAll({ where: { role: 'user', isVerified: true }, attributes: ['email'] })
    .then((users) => {
      const recipients = users.map((user) => user.email).filter(Boolean);
      return sendNewPostEmails({ post, recipients });
    })
    .catch((error) => {
      console.error('[emails] Blog post notification failed for', post.slug, error.message);
    });
}

async function findOr404(id) {
  if (!UUID_PATTERN.test(String(id))) throw new HttpError(404, 'Post not found');

  const post = await Post.findByPk(id, { include: [withAuthor] });
  if (!post) throw new HttpError(404, 'Post not found');

  return post;
}

function guardPublish(payload, existing) {
  const willPublish = payload.isPublished ?? existing?.isPublished ?? false;

  if (!willPublish) return;

  const body = payload.body ?? existing?.body ?? '';

  if (!body.trim()) {
    throw invalid('isPublished', 'Write the post before publishing it.');
  }
}

export const list = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(req.query.limit) || 20));
  const where = {};

  if (req.query.published === 'true') where.isPublished = true;
  if (req.query.published === 'false') where.isPublished = false;

  const search = String(req.query.search || '').trim();

  if (search) {
    where.title = { [Op.like]: `%${search}%` };
  }

  const { rows, count } = await Post.findAndCountAll({
    where,
    attributes: LIST_FIELDS,
    include: [withAuthor],
    order: [
      [sequelize.literal('`published_at` IS NULL'), 'DESC'],
      ['publishedAt', 'DESC'],
      ['updatedAt', 'DESC'],
    ],
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
  const post = await findOr404(req.params.id);
  res.json({ data: post });
});

export const create = asyncHandler(async (req, res) => {
  const payload = buildPayload(req.body, { partial: false });

  guardPublish(payload, null);

  payload.authorId = req.user.id;
  payload.slug = await buildUniqueSlug(Post, payload.slug || payload.title);

  if (payload.isPublished && !payload.publishedAt) {
    payload.publishedAt = new Date();
  }

  const post = await Post.create(payload);
  const fresh = await Post.findByPk(post.id, { include: [withAuthor] });

  if (fresh.isPublished) notifyReaders(fresh);

  res.status(201).json({ data: fresh });
});

export const update = asyncHandler(async (req, res) => {
  const post = await findOr404(req.params.id);
  const payload = buildPayload(req.body, { partial: true });

  guardPublish(payload, post);

  if (payload.slug) {
    payload.slug = await buildUniqueSlug(Post, payload.slug, { excludeId: post.id });
  }

  const publishing = payload.isPublished === true && !post.isPublished;

  if (publishing && !payload.publishedAt && !post.publishedAt) {
    payload.publishedAt = new Date();
  }

  const oldCover = post.coverImage;

  await post.update(payload);

  if (oldCover && payload.coverImage !== undefined && payload.coverImage !== oldCover) {
    discard(oldCover);
  }

  const fresh = await Post.findByPk(post.id, { include: [withAuthor] });

  if (publishing) notifyReaders(fresh);

  res.json({ data: fresh });
});

export const remove = asyncHandler(async (req, res) => {
  const post = await findOr404(req.params.id);
  const { coverImage } = post;

  await post.destroy();

  if (coverImage) discard(coverImage);

  res.status(204).end();
});

function discard(url) {
  deleteImageByUrl(url).catch((error) => {
    console.error('S3 delete failed for', url, error.message);
  });
}
