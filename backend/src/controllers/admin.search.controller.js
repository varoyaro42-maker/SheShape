import { Op } from 'sequelize'
import { asyncHandler } from '../utils/asyncHandler.js'
import { User, Product, Order } from '../models/index.js'

const RESULT_LIMIT = 5

export const search = asyncHandler(async (req, res) => {
  const term = String(req.query.q ?? '').trim()

  if (term.length < 2) {
    return res.json({ data: { users: [], products: [], orders: [] } })
  }

  const like = `%${term}%`

  const [users, products, orders] = await Promise.all([
    User.findAll({
      where: {
        role: 'user',
        [Op.or]: [{ name: { [Op.like]: like } }, { email: { [Op.like]: like } }, { phone: { [Op.like]: like } }]
      },
      limit: RESULT_LIMIT,
      attributes: ['id', 'name', 'email', 'avatarUrl']
    }),
    Product.findAll({
      where: { name: { [Op.like]: like } },
      limit: RESULT_LIMIT,
      attributes: ['id', 'name', 'slug', 'price']
    }),
    Order.findAll({
      where: {
        [Op.or]: [{ orderNumber: { [Op.like]: like } }, { customerName: { [Op.like]: like } }]
      },
      limit: RESULT_LIMIT,
      attributes: ['id', 'orderNumber', 'customerName', 'total', 'status']
    })
  ])

  res.json({ data: { users, products, orders } })
})
