import { Op } from 'sequelize'
import { asyncHandler } from '../utils/asyncHandler.js'
import { HttpError } from '../utils/httpError.js'
import { Subscriber, SUBSCRIBER_STATUSES, sequelize } from '../models/index.js'
import { brevoListConfigured } from '../utils/brevo.js'

const MAX_LIMIT = 100
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const list = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1)
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(req.query.limit) || 25))
  const where = {}

  const status = String(req.query.status || '').trim()
  if (status) {
    if (!SUBSCRIBER_STATUSES.includes(status)) throw new HttpError(400, 'Unknown status filter.')
    where.status = status
  }

  const search = String(req.query.search || '').trim()
  if (search) {
    where[Op.or] = [{ email: { [Op.like]: `%${search}%` } }, { name: { [Op.like]: `%${search}%` } }]
  }

  const { rows, count } = await Subscriber.findAndCountAll({
    where,
    attributes: { exclude: ['token'] },
    order: [['createdAt', 'DESC']],
    limit,
    offset: (page - 1) * limit
  })

  res.json({
    data: rows,
    meta: { page, limit, total: count, pages: Math.ceil(count / limit) || 1, brevoSync: brevoListConfigured() }
  })
})

export const counts = asyncHandler(async (req, res) => {
  const rows = await Subscriber.findAll({
    attributes: ['status', [sequelize.fn('COUNT', sequelize.col('id')), 'total']],
    group: ['status'],
    raw: true
  })

  const data = Object.fromEntries(SUBSCRIBER_STATUSES.map((status) => [status, 0]))
  for (const row of rows) data[row.status] = Number(row.total)

  res.json({ data })
})

/** CSV of confirmed subscribers, for importing into any email tool. */
export const exportCsv = asyncHandler(async (req, res) => {
  const rows = await Subscriber.findAll({
    where: { status: 'subscribed' },
    attributes: ['email', 'name', 'confirmedAt'],
    order: [['confirmedAt', 'ASC']]
  })

  const escape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`
  const lines = ['email,name,confirmed_at']
  for (const row of rows) {
    lines.push([row.email, row.name, row.confirmedAt?.toISOString() ?? ''].map(escape).join(','))
  }

  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="sheshape-subscribers-${new Date().toISOString().slice(0, 10)}.csv"`)
  res.send(`${lines.join('\n')}\n`)
})

export const remove = asyncHandler(async (req, res) => {
  if (!UUID_PATTERN.test(String(req.params.id))) throw new HttpError(404, 'Subscriber not found.')

  const subscriber = await Subscriber.findByPk(req.params.id)
  if (!subscriber) throw new HttpError(404, 'Subscriber not found.')

  await subscriber.destroy()
  res.status(204).end()
})
