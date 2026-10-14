import { Op } from 'sequelize'
import { asyncHandler } from '../utils/asyncHandler.js'
import {
  sequelize,
  Order,
  OrderItem,
  Product,
  User,
  ORDER_STATUSES
} from '../models/index.js'
import { sendOrderStatusEmail } from '../utils/emails.js'

const MAX_LIMIT = 50
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const FORWARD = {
  pending: ['paid', 'cancelled'],
  paid: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: []
}

const RESTOCKING = new Set(['pending', 'paid'])

const withItems = {
  model: OrderItem,
  as: 'items',
  attributes: ['id', 'productId', 'name', 'price', 'quantity']
}

const withCustomer = {
  model: User,
  as: 'user',
  attributes: ['id', 'name', 'email']
}

function fail(status, message, details) {
  const error = new Error(message)
  error.status = status
  if (details) error.details = details
  return error
}

export const list = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1)
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(req.query.limit) || 20))
  const where = {}

  const status = String(req.query.status || '').trim()

  if (status) {
    if (!ORDER_STATUSES.includes(status)) {
      throw fail(400, `status must be one of: ${ORDER_STATUSES.join(', ')}.`)
    }
    where.status = status
  }

  const search = String(req.query.search || '').trim()

  if (search) {
    where[Op.or] = [
      { orderNumber: { [Op.like]: `%${search}%` } },
      { customerName: { [Op.like]: `%${search}%` } },
      { customerPhone: { [Op.like]: `%${search}%` } }
    ]
  }

  const { rows, count } = await Order.findAndCountAll({
    where,
    include: [withItems],
    order: [['createdAt', 'DESC']],
    limit,
    offset: (page - 1) * limit,
    distinct: true
  })

  const data = rows.map((order) => {
    const plain = order.toJSON()
    plain.itemCount = plain.items.reduce((sum, item) => sum + item.quantity, 0)
    delete plain.items
    return plain
  })

  res.json({
    data,
    meta: { page, limit, total: count, pages: Math.ceil(count / limit) || 1 }
  })
})

export const counts = asyncHandler(async (req, res) => {
  const rows = await Order.findAll({
    attributes: ['status', [sequelize.fn('COUNT', sequelize.col('id')), 'total']],
    group: ['status'],
    raw: true
  })

  const data = Object.fromEntries(ORDER_STATUSES.map((status) => [status, 0]))

  for (const row of rows) {
    data[row.status] = Number(row.total)
  }

  res.json({ data })
})

export const detail = asyncHandler(async (req, res) => {
  if (!UUID_PATTERN.test(String(req.params.id))) throw fail(404, 'Order not found.')

  const order = await Order.findByPk(req.params.id, {
    include: [withItems, withCustomer],
    order: [[{ model: OrderItem, as: 'items' }, 'name', 'ASC']]
  })

  if (!order) throw fail(404, 'Order not found.')

  res.json({ data: order })
})

export const updateStatus = asyncHandler(async (req, res) => {
  if (!UUID_PATTERN.test(String(req.params.id))) throw fail(404, 'Order not found.')

  const next = String(req.body?.status ?? '').trim()

  if (!ORDER_STATUSES.includes(next)) {
    throw fail(400, `status must be one of: ${ORDER_STATUSES.join(', ')}.`, [
      { field: 'status', message: 'Choose a valid status.' }
    ])
  }

  const { order: updated, changed } = await sequelize.transaction(async (transaction) => {
    // Lock the orders row on its own. Postgres rejects FOR UPDATE against the
    // nullable side of an outer join, so the items are read separately below.
    const order = await Order.findByPk(req.params.id, {
      transaction,
      lock: transaction.LOCK.UPDATE
    })

    if (!order) throw fail(404, 'Order not found.')

    if (order.status === next) return { order, changed: false }

    if (!FORWARD[order.status].includes(next)) {
      throw fail(
        409,
        `An order that is ${order.status} cannot be marked ${next}.`
      )
    }

    if (next === 'cancelled' && RESTOCKING.has(order.status)) {
      const items = await OrderItem.findAll({
        where: { orderId: order.id },
        attributes: ['productId', 'quantity'],
        transaction
      })

      for (const item of items) {
        if (!item.productId) continue

        await Product.increment('stock', {
          by: item.quantity,
          where: { id: item.productId },
          transaction
        })
      }
    }

    order.status = next
    await order.save({ transaction })

    return { order, changed: true }
  })

  const fresh = await Order.findByPk(updated.id, {
    include: [withItems, withCustomer]
  })

  if (changed && fresh.user?.email) {
    sendOrderStatusEmail({ to: fresh.user.email, order: fresh, status: next }).catch((error) => {
      console.error('[emails] Order status email failed for', fresh.orderNumber, error.message)
    })
  }

  res.json({ data: fresh })
})
