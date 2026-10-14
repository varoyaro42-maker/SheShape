import { Op } from 'sequelize'
import { Product, ProductImage, Category } from '../models/index.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { notFoundError, badRequestError } from '../utils/httpError.js'

const imageInclude = {
  model: ProductImage,
  as: 'images',
  attributes: ['id', 'url', 'sortOrder', 'color', 'colorHex'],
  separate: true,
  order: [['sortOrder', 'ASC']]
}

const categoryInclude = {
  model: Category,
  as: 'category',
  attributes: ['id', 'name', 'slug']
}

export const listProducts = asyncHandler(async (req, res) => {
  const page = Math.max(Number(req.query.page) || 1, 1)
  const limit = Math.min(Math.max(Number(req.query.limit) || 12, 1), 50)
  const { category, search } = req.query

  const where = { isPublished: true }

  if (category) {
    const match = await Category.findOne({ where: { slug: category } })
    if (!match) {
      throw badRequestError(`Unknown category: ${category}`)
    }
    where.categoryId = match.id
  }

  if (search) {
    where.name = { [Op.like]: `%${search.trim()}%` }
  }

  const { rows, count } = await Product.findAndCountAll({
    where,
    include: [imageInclude, categoryInclude],
    order: [['createdAt', 'DESC']],
    limit,
    offset: (page - 1) * limit,
    distinct: true
  })

  res.json({
    data: rows,
    meta: {
      page,
      limit,
      total: count,
      pages: Math.ceil(count / limit)
    }
  })
})

export const getProductBySlug = asyncHandler(async (req, res) => {
  const product = await Product.findOne({
    where: { slug: req.params.slug, isPublished: true },
    include: [imageInclude, categoryInclude]
  })

  if (!product) {
    throw notFoundError('Product not found')
  }

  res.json({ data: product })
})

export const listCategories = asyncHandler(async (req, res) => {
  const categories = await Category.findAll({ order: [['name', 'ASC']] })
  res.json({ data: categories })
})
