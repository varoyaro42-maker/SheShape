import { Op } from 'sequelize'
import { asyncHandler } from '../utils/asyncHandler.js'
import { sequelize, User, Order } from '../models/index.js'
import { deleteImageByUrl } from '../utils/storage.js'

const MAX_LIMIT = 50
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const REVENUE_STATUSES = ['paid', 'shipped', 'delivered']

function fail(status, message, details) {
  const error = new Error(message)
  error.status = status
  if (details) error.details = details
  return error
}

async function orderStatsFor(userIds) {
  if (userIds.length === 0) return new Map()

  const rows = await Order.findAll({
    attributes: [
      'userId',
      [sequelize.fn('COUNT', sequelize.col('id')), 'orderCount'],
      [
        sequelize.fn(
          'SUM',
          sequelize.literal(`CASE WHEN status IN ('${REVENUE_STATUSES.join("','")}') THEN total ELSE 0 END`)
        ),
        'totalSpent'
      ]
    ],
    where: { userId: { [Op.in]: userIds } },
    group: ['userId'],
    raw: true
  })

  return new Map(
    rows.map((row) => [row.userId, { orderCount: Number(row.orderCount), totalSpent: Number(row.totalSpent) || 0 }])
  )
}

export const list = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1)
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(req.query.limit) || 20))
  const where = { role: 'user' }

  const search = String(req.query.search || '').trim()
  if (search) {
    where[Op.or] = [
      { name: { [Op.like]: `%${search}%` } },
      { email: { [Op.like]: `%${search}%` } },
      { phone: { [Op.like]: `%${search}%` } }
    ]
  }

  if (req.query.verified === 'true') where.isVerified = true
  if (req.query.verified === 'false') where.isVerified = false

  const { rows, count } = await User.findAndCountAll({
    where,
    order: [['createdAt', 'DESC']],
    limit,
    offset: (page - 1) * limit,
    attributes: ['id', 'name', 'email', 'phone', 'avatarUrl', 'isVerified', 'createdAt']
  })

  const stats = await orderStatsFor(rows.map((row) => row.id))

  const data = rows.map((row) => {
    const plain = row.toJSON()
    const rowStats = stats.get(plain.id) ?? { orderCount: 0, totalSpent: 0 }
    return { ...plain, ...rowStats }
  })

  res.json({
    data,
    meta: { page, limit, total: count, pages: Math.ceil(count / limit) || 1 }
  })
})

export const detail = asyncHandler(async (req, res) => {
  if (!UUID_PATTERN.test(String(req.params.id))) throw fail(404, 'Customer not found.')

  const user = await User.findOne({
    where: { id: req.params.id, role: 'user' },
    attributes: ['id', 'name', 'email', 'phone', 'avatarUrl', 'isVerified', 'createdAt']
  })

  if (!user) throw fail(404, 'Customer not found.')

  const orders = await Order.findAll({
    where: { userId: user.id },
    order: [['createdAt', 'DESC']],
    attributes: ['id', 'orderNumber', 'total', 'status', 'createdAt']
  })

  const totalSpent = orders
    .filter((order) => REVENUE_STATUSES.includes(order.status))
    .reduce((sum, order) => sum + order.total, 0)

  res.json({
    data: {
      ...user.toJSON(),
      orders,
      orderCount: orders.length,
      totalSpent
    }
  })
})

export const remove = asyncHandler(async (req, res) => {
  if (!UUID_PATTERN.test(String(req.params.id))) throw fail(404, 'Customer not found.')

  const user = await User.findOne({ where: { id: req.params.id, role: 'user' } })

  if (!user) throw fail(404, 'Customer not found.')

  const { avatarUrl } = user
  await user.destroy()
  if (avatarUrl) deleteImageByUrl(avatarUrl).catch((error) => console.error('Delete failed for', avatarUrl, error.message))

  res.status(204).end()
})
