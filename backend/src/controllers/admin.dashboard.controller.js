import { Op } from 'sequelize'
import { asyncHandler } from '../utils/asyncHandler.js'
import { sequelize, Product, Program, Post, Order, User, Booking, Subscriber, ORDER_STATUSES } from '../models/index.js'

const REVENUE_STATUSES = ['paid', 'shipped', 'delivered']
const DAY_MS = 24 * 60 * 60 * 1000
const PERIOD_DAYS = 30
const LOW_STOCK_THRESHOLD = 5

function pctChange(current, previous) {
  if (previous === 0) return current === 0 ? 0 : 100
  return Math.round(((current - previous) / previous) * 1000) / 10
}

export const overview = asyncHandler(async (req, res) => {
  const now = new Date()
  const periodStart = new Date(now.getTime() - PERIOD_DAYS * DAY_MS)
  const previousStart = new Date(now.getTime() - PERIOD_DAYS * 2 * DAY_MS)

  const [
    productTotal,
    productPublished,
    programTotal,
    programOpen,
    postTotal,
    postPublished,
    orderRows,
    recentOrders,
    totalCustomers,
    customersThisPeriod,
    customersPrevPeriod,
    revenueThisPeriod,
    revenuePrevPeriod,
    ordersThisPeriod,
    ordersPrevPeriod,
    customersOrderedThisPeriod,
    customersOrderedPrevPeriod,
    dailyRevenueRows,
    recentUsers,
    recentCompletedOrders,
    recentProducts,
    lowStockProducts
  ] = await Promise.all([
    Product.count(),
    Product.count({ where: { isPublished: true } }),
    Program.count(),
    Program.count({ where: { status: 'open' } }),
    Post.count(),
    Post.count({ where: { isPublished: true } }),
    Order.findAll({
      attributes: ['status', [sequelize.fn('COUNT', sequelize.col('id')), 'total']],
      group: ['status'],
      raw: true
    }),
    Order.findAll({
      order: [['createdAt', 'DESC']],
      limit: 5,
      attributes: ['id', 'orderNumber', 'customerName', 'total', 'status', 'createdAt']
    }),
    User.count({ where: { role: 'user' } }),
    User.count({ where: { role: 'user', createdAt: { [Op.gte]: periodStart } } }),
    User.count({
      where: { role: 'user', createdAt: { [Op.gte]: previousStart, [Op.lt]: periodStart } }
    }),
    Order.sum('total', {
      where: { status: { [Op.in]: REVENUE_STATUSES }, createdAt: { [Op.gte]: periodStart } }
    }),
    Order.sum('total', {
      where: {
        status: { [Op.in]: REVENUE_STATUSES },
        createdAt: { [Op.gte]: previousStart, [Op.lt]: periodStart }
      }
    }),
    Order.count({
      where: { status: { [Op.ne]: 'cancelled' }, createdAt: { [Op.gte]: periodStart } }
    }),
    Order.count({
      where: {
        status: { [Op.ne]: 'cancelled' },
        createdAt: { [Op.gte]: previousStart, [Op.lt]: periodStart }
      }
    }),
    Order.count({
      distinct: true,
      col: 'userId',
      where: { userId: { [Op.ne]: null }, createdAt: { [Op.gte]: periodStart } }
    }),
    Order.count({
      distinct: true,
      col: 'userId',
      where: {
        userId: { [Op.ne]: null },
        createdAt: { [Op.gte]: previousStart, [Op.lt]: periodStart }
      }
    }),
    Order.findAll({
      attributes: [
        [sequelize.fn('DATE', sequelize.col('created_at')), 'date'],
        [sequelize.fn('SUM', sequelize.col('total')), 'revenue'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'orders']
      ],
      where: { status: { [Op.in]: REVENUE_STATUSES }, createdAt: { [Op.gte]: periodStart } },
      group: [sequelize.fn('DATE', sequelize.col('created_at'))],
      order: [[sequelize.fn('DATE', sequelize.col('created_at')), 'ASC']],
      raw: true
    }),
    User.findAll({
      where: { role: 'user' },
      order: [['createdAt', 'DESC']],
      limit: 5,
      attributes: ['id', 'name', 'createdAt']
    }),
    Order.findAll({
      where: { status: 'delivered' },
      order: [['updatedAt', 'DESC']],
      limit: 5,
      attributes: ['id', 'orderNumber', 'updatedAt']
    }),
    Product.findAll({
      order: [['createdAt', 'DESC']],
      limit: 5,
      attributes: ['id', 'name', 'createdAt']
    }),
    Product.findAll({
      where: { isPublished: true, stock: { [Op.lte]: LOW_STOCK_THRESHOLD } },
      order: [['stock', 'ASC']],
      limit: 5,
      attributes: ['id', 'name', 'stock', 'updatedAt']
    })
  ])

  const [newBookings, subscriberTotal] = await Promise.all([
    Booking.count({ where: { status: 'new' } }),
    Subscriber.count({ where: { status: 'subscribed' } })
  ])

  const orderCounts = Object.fromEntries(ORDER_STATUSES.map((status) => [status, 0]))
  for (const row of orderRows) {
    orderCounts[row.status] = Number(row.total)
  }
  const orderTotal = Object.values(orderCounts).reduce((sum, value) => sum + value, 0)

  const revenueNow = Number(revenueThisPeriod) || 0
  const revenuePrev = Number(revenuePrevPeriod) || 0
  const conversionNow = totalCustomers > 0 ? (customersOrderedThisPeriod / totalCustomers) * 100 : 0
  const conversionPrev = totalCustomers > 0 ? (customersOrderedPrevPeriod / totalCustomers) * 100 : 0

  const revenueSeries = dailyRevenueRows.map((row) => ({
    date: row.date,
    revenue: Number(row.revenue) || 0,
    orders: Number(row.orders) || 0
  }))

  const activity = [
    ...recentUsers.map((entry) => ({
      type: 'user',
      message: 'New user registered',
      detail: entry.name,
      at: entry.createdAt
    })),
    ...recentCompletedOrders.map((entry) => ({
      type: 'order',
      message: 'Order completed',
      detail: entry.orderNumber,
      at: entry.updatedAt
    })),
    ...recentProducts.map((entry) => ({
      type: 'product',
      message: 'New product added',
      detail: entry.name,
      at: entry.createdAt
    })),
    ...lowStockProducts.map((entry) => ({
      type: 'stock',
      message: 'Low stock alert',
      detail: `${entry.name} — ${entry.stock} left`,
      at: entry.updatedAt
    }))
  ]
    .sort((a, b) => new Date(b.at) - new Date(a.at))
    .slice(0, 8)

  res.json({
    data: {
      products: { total: productTotal, published: productPublished },
      programs: { total: programTotal, open: programOpen },
      posts: { total: postTotal, published: postPublished },
      orders: { total: orderTotal, byStatus: orderCounts },
      bookings: { new: newBookings },
      subscribers: { total: subscriberTotal },
      recentOrders,
      analytics: {
        periodDays: PERIOD_DAYS,
        customers: {
          total: totalCustomers,
          changePct: pctChange(customersThisPeriod, customersPrevPeriod)
        },
        revenue: {
          total: revenueNow,
          changePct: pctChange(revenueNow, revenuePrev)
        },
        orders: {
          total: ordersThisPeriod,
          changePct: pctChange(ordersThisPeriod, ordersPrevPeriod)
        },
        conversionRate: {
          value: Math.round(conversionNow * 10) / 10,
          changePct: pctChange(conversionNow, conversionPrev)
        },
        revenueSeries,
        activity
      }
    }
  })
})
