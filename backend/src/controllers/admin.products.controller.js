import { Op } from 'sequelize'
import { asyncHandler } from '../utils/asyncHandler.js'
import { deleteImageByUrl } from '../utils/storage.js'
import { buildUniqueSlug } from '../utils/slug.js'
import {
  sequelize,
  Product,
  ProductImage,
  OrderItem,
  Category
} from '../models/index.js'

const MAX_LIMIT = 50
const MAX_IMAGES = 40
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i

const withImages = {
  model: ProductImage,
  as: 'images',
  attributes: ['id', 'url', 'sortOrder', 'color', 'colorHex']
}

const withCategory = {
  model: Category,
  as: 'category',
  attributes: ['id', 'name', 'slug']
}

const imagesFirst = [[{ model: ProductImage, as: 'images' }, 'sortOrder', 'ASC']]

function fail(status, message, details) {
  const error = new Error(message)
  error.status = status
  if (details) error.details = details
  return error
}

function invalid(field, message) {
  return fail(400, message, [{ field, message }])
}

function readString(body, field, { max, required }) {
  const raw = body[field]
  const value = typeof raw === 'string' ? raw.trim() : ''

  if (!value) {
    if (required) throw invalid(field, `${field} is required.`)
    return ''
  }

  if (max && value.length > max) {
    throw invalid(field, `${field} must be ${max} characters or fewer.`)
  }

  return value
}

function readInteger(body, field, { required }) {
  const raw = body[field]

  if (raw === undefined || raw === null || raw === '') {
    if (required) throw invalid(field, `${field} is required.`)
    return undefined
  }

  const value = Number(raw)

  if (!Number.isInteger(value) || value < 0) {
    throw invalid(field, `${field} must be a whole number of zero or more.`)
  }

  return value
}

async function readCategoryId(body, { required }) {
  const raw = body.categoryId

  if (raw === undefined || raw === null || raw === '') {
    if (required) throw invalid('categoryId', 'categoryId is required.')
    return undefined
  }

  const value = String(raw).trim()

  if (!UUID_PATTERN.test(value)) {
    throw invalid('categoryId', 'categoryId must be a valid category id.')
  }

  const category = await Category.findByPk(value)
  if (!category) {
    throw invalid('categoryId', 'That category does not exist.')
  }

  return value
}

function readBoolean(body, field) {
  const raw = body[field]

  if (raw === undefined) return undefined
  if (typeof raw === 'boolean') return raw
  if (raw === 'true') return true
  if (raw === 'false') return false

  throw invalid(field, `${field} must be true or false.`)
}

function readColor(entry, index) {
  const color = typeof entry === 'object' && entry !== null ? String(entry.color ?? '').trim() : ''
  const rawHex = typeof entry === 'object' && entry !== null ? String(entry.colorHex ?? '').trim() : ''

  if (rawHex && !HEX_COLOR_PATTERN.test(rawHex)) {
    throw invalid('images', `Image ${index + 1} has an invalid color hex.`)
  }

  return { color: color || null, colorHex: rawHex || null }
}

function readImageUrls(body) {
  const raw = body.images

  if (raw === undefined || raw === null) return []
  if (!Array.isArray(raw)) throw invalid('images', 'images must be a list.')
  if (raw.length > MAX_IMAGES) {
    throw invalid('images', `A product can hold at most ${MAX_IMAGES} images.`)
  }

  return raw.map((entry, index) => {
    const url = typeof entry === 'string' ? entry.trim() : String(entry?.url ?? '').trim()
    if (!url) throw invalid('images', `Image ${index + 1} has no url.`)
    return { url, ...readColor(entry, index) }
  })
}

// "S, M, L" or ["S", "M", "L"] -> ["S", "M", "L"], without blanks or repeats.
function readSizes(body) {
  const raw = body.sizes
  if (raw === undefined || raw === null || raw === '') return []
  const list = Array.isArray(raw) ? raw : String(raw).split(',')
  const sizes = [...new Set(list.map((size) => String(size ?? '').trim()).filter(Boolean))]
  if (sizes.length > 20) throw invalid('sizes', 'A product can have at most 20 sizes.')
  if (sizes.some((size) => size.length > 20)) throw invalid('sizes', 'Each size must be 20 characters or fewer.')
  return sizes
}

async function buildPayload(body, { partial }) {
  const has = (field) => Object.prototype.hasOwnProperty.call(body, field)
  const payload = {}

  if (!partial || has('name')) {
    payload.name = readString(body, 'name', { max: 160, required: true })
  }

  if (!partial || has('description')) {
    payload.description = readString(body, 'description', { required: false })
  }

  if (!partial || has('price')) {
    payload.price = readInteger(body, 'price', { required: true })
  }

  if (!partial || has('categoryId')) {
    payload.categoryId = await readCategoryId(body, { required: true })
  }

  if (!partial || has('stock')) {
    const stock = readInteger(body, 'stock', { required: false })
    payload.stock = stock === undefined ? 0 : stock
  }

  if (!partial || has('sizes')) {
    payload.sizes = readSizes(body)
  }

  if (!partial || has('isPublished')) {
    const isPublished = readBoolean(body, 'isPublished')
    payload.isPublished = isPublished === undefined ? false : isPublished
  }

  if (has('slug')) {
    payload.slug = readString(body, 'slug', { max: 180, required: true })
  }

  return payload
}

async function findOr404(id, options = {}) {
  if (!UUID_PATTERN.test(String(id))) throw fail(404, 'Product not found.')

  const product = await Product.findByPk(id, options)
  if (!product) throw fail(404, 'Product not found.')

  return product
}

async function nextSortOrder(productId, transaction) {
  const highest = await ProductImage.max('sortOrder', {
    where: { productId },
    transaction
  })

  return Number.isFinite(highest) ? highest + 1 : 0
}

async function discardObject(url) {
  try {
    await deleteImageByUrl(url)
  } catch (error) {
    console.error('S3 delete failed for', url, error.message)
  }
}

export const list = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1)
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(req.query.limit) || 20))
  const where = {}

  if (req.query.categoryId) {
    where.categoryId = await readCategoryId(req.query, { required: true })
  }

  if (req.query.published === 'true') where.isPublished = true
  if (req.query.published === 'false') where.isPublished = false

  const search = String(req.query.search || '').trim()
  if (search) {
    where.name = { [Op.like]: `%${search}%` }
  }

  const { rows, count } = await Product.findAndCountAll({
    where,
    include: [withImages, withCategory],
    order: [['createdAt', 'DESC'], ...imagesFirst],
    limit,
    offset: (page - 1) * limit,
    distinct: true
  })

  res.json({
    data: rows,
    meta: { page, limit, total: count, pages: Math.ceil(count / limit) || 1 }
  })
})

export const detail = asyncHandler(async (req, res) => {
  const product = await findOr404(req.params.id, {
    include: [withImages, withCategory],
    order: imagesFirst
  })

  res.json({ data: product })
})

export const create = asyncHandler(async (req, res) => {
  const payload = await buildPayload(req.body, { partial: false })
  const urls = readImageUrls(req.body)

  if (payload.isPublished && urls.length === 0) {
    throw invalid('isPublished', 'Add at least one image before publishing.')
  }

  const product = await sequelize.transaction(async (transaction) => {
    payload.slug = await buildUniqueSlug(Product, payload.slug || payload.name, { transaction })

    const created = await Product.create(payload, { transaction })

    if (urls.length) {
      await ProductImage.bulkCreate(
        urls.map((image, index) => ({ productId: created.id, sortOrder: index, ...image })),
        { transaction, validate: true }
      )
    }

    return created
  })

  const fresh = await Product.findByPk(product.id, {
    include: [withImages, withCategory],
    order: imagesFirst
  })

  res.status(201).json({ data: fresh })
})

export const update = asyncHandler(async (req, res) => {
  const product = await findOr404(req.params.id)
  const payload = await buildPayload(req.body, { partial: true })

  if (payload.isPublished) {
    const images = await ProductImage.count({ where: { productId: product.id } })
    if (images === 0) {
      throw invalid('isPublished', 'Add at least one image before publishing.')
    }
  }

  if (payload.slug) {
    payload.slug = await buildUniqueSlug(Product, payload.slug, { excludeId: product.id })
  }

  await product.update(payload)

  const fresh = await Product.findByPk(product.id, {
    include: [withImages, withCategory],
    order: imagesFirst
  })

  res.json({ data: fresh })
})

export const remove = asyncHandler(async (req, res) => {
  const product = await findOr404(req.params.id, { include: [withImages] })

  const ordered = await OrderItem.count({ where: { productId: product.id } })

  if (ordered > 0) {
    throw fail(
      409,
      'This product appears in past orders, so it cannot be deleted. Unpublish it to hide it from the shop.'
    )
  }

  const urls = product.images.map((image) => image.url)

  await product.destroy()

  await Promise.all(urls.map(discardObject))

  res.status(204).end()
})

export const attachImage = asyncHandler(async (req, res) => {
  const product = await findOr404(req.params.id)
  const url = readString(req.body, 'url', { required: true })
  const { color, colorHex } = readColor(req.body, 0)

  const existing = await ProductImage.count({ where: { productId: product.id } })

  if (existing >= MAX_IMAGES) {
    throw fail(409, `A product can hold at most ${MAX_IMAGES} images.`)
  }

  const image = await ProductImage.create({
    productId: product.id,
    url,
    color,
    colorHex,
    sortOrder: await nextSortOrder(product.id)
  })

  res.status(201).json({ data: image })
})

export const updateImage = asyncHandler(async (req, res) => {
  const product = await findOr404(req.params.id)

  const image = await ProductImage.findOne({
    where: { id: req.params.imageId, productId: product.id }
  })

  if (!image) throw fail(404, 'Image not found on this product.')

  const { color, colorHex } = readColor(req.body, 0)

  image.color = color
  image.colorHex = colorHex
  await image.save()

  res.json({ data: image })
})

export const detachImage = asyncHandler(async (req, res) => {
  const product = await findOr404(req.params.id)

  const image = await ProductImage.findOne({
    where: { id: req.params.imageId, productId: product.id }
  })

  if (!image) throw fail(404, 'Image not found on this product.')

  const remaining = await ProductImage.count({ where: { productId: product.id } })

  if (product.isPublished && remaining <= 1) {
    throw fail(409, 'A published product needs at least one image. Unpublish it first.')
  }

  const { url } = image

  await image.destroy()
  await discardObject(url)

  res.status(204).end()
})

export const reorderImages = asyncHandler(async (req, res) => {
  const product = await findOr404(req.params.id)
  const ids = Array.isArray(req.body.ids) ? req.body.ids : null

  if (!ids?.length) throw invalid('ids', 'ids must be a list of image ids.')

  const images = await ProductImage.findAll({
    where: { productId: product.id },
    attributes: ['id']
  })

  const owned = new Set(images.map((image) => image.id))

  if (ids.length !== owned.size || ids.some((id) => !owned.has(id))) {
    throw invalid('ids', 'ids must list every image on this product exactly once.')
  }

  await sequelize.transaction(async (transaction) => {
    for (const [index, id] of ids.entries()) {
      await ProductImage.update({ sortOrder: index }, { where: { id }, transaction })
    }
  })

  const fresh = await ProductImage.findAll({
    where: { productId: product.id },
    attributes: ['id', 'url', 'sortOrder'],
    order: [['sortOrder', 'ASC']]
  })

  res.json({ data: fresh })
})
