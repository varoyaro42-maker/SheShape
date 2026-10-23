import { asyncHandler } from '../utils/asyncHandler.js'
import { buildUniqueSlug } from '../utils/slug.js'
import { HttpError } from '../utils/httpError.js'
import { Category } from '../models/index.js'

export const list = asyncHandler(async (req, res) => {
  const categories = await Category.findAll({ order: [['name', 'ASC']] })
  res.json({ data: categories })
})

export const create = asyncHandler(async (req, res) => {
  const name = String(req.body?.name ?? '').trim()

  if (!name) {
    throw new HttpError(400, 'Category name is required', [
      { field: 'name', message: 'Category name is required.' }
    ])
  }

  if (name.length > 80) {
    throw new HttpError(400, 'Category name is too long', [
      { field: 'name', message: 'Category name must be 80 characters or fewer.' }
    ])
  }

  const slug = await buildUniqueSlug(Category, name)
  const category = await Category.create({ name, slug })

  res.status(201).json({ data: category })
})
