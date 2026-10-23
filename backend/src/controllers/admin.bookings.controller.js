import { Op } from 'sequelize'
import { asyncHandler } from '../utils/asyncHandler.js'
import { HttpError } from '../utils/httpError.js'
import { Booking, Program, User, BOOKING_STATUSES, sequelize } from '../models/index.js'
import { sendBookingStatusEmail } from '../utils/emails.js'

const MAX_LIMIT = 50
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const includes = [
  { model: Program, as: 'program', attributes: ['id', 'name', 'slug'] },
  { model: User, as: 'respondedBy', attributes: ['id', 'name'] }
]

export const list = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1)
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(req.query.limit) || 20))
  const where = {}

  const status = String(req.query.status || '').trim()
  if (status) {
    if (!BOOKING_STATUSES.includes(status)) throw new HttpError(400, 'Unknown status filter.')
    where.status = status
  }

  const programId = String(req.query.programId || '').trim()
  if (programId && UUID_PATTERN.test(programId)) where.programId = programId

  const search = String(req.query.search || '').trim()
  if (search) {
    where[Op.or] = [
      { name: { [Op.like]: `%${search}%` } },
      { email: { [Op.like]: `%${search}%` } },
      { phone: { [Op.like]: `%${search}%` } },
      { programName: { [Op.like]: `%${search}%` } }
    ]
  }

  const { rows, count } = await Booking.findAndCountAll({
    where,
    include: includes,
    order: [
      [sequelize.literal("`Booking`.`status` = 'new'"), 'DESC'],
      ['createdAt', 'DESC']
    ],
    limit,
    offset: (page - 1) * limit,
    distinct: true
  })

  res.json({ data: rows, meta: { page, limit, total: count, pages: Math.ceil(count / limit) || 1 } })
})

export const counts = asyncHandler(async (req, res) => {
  const rows = await Booking.findAll({
    attributes: ['status', [sequelize.fn('COUNT', sequelize.col('id')), 'total']],
    group: ['status'],
    raw: true
  })

  const data = Object.fromEntries(BOOKING_STATUSES.map((status) => [status, 0]))
  for (const row of rows) data[row.status] = Number(row.total)

  res.json({ data })
})

export const detail = asyncHandler(async (req, res) => {
  if (!UUID_PATTERN.test(String(req.params.id))) throw new HttpError(404, 'Booking not found.')

  const booking = await Booking.findByPk(req.params.id, { include: includes })
  if (!booking) throw new HttpError(404, 'Booking not found.')

  res.json({ data: booking })
})

/** Confirm or decline. The customer gets an email with the admin's note. */
export const updateStatus = asyncHandler(async (req, res) => {
  if (!UUID_PATTERN.test(String(req.params.id))) throw new HttpError(404, 'Booking not found.')

  const status = String(req.body?.status ?? '').trim()
  const note = String(req.body?.note ?? '').trim().slice(0, 2000)

  if (!BOOKING_STATUSES.includes(status)) {
    throw new HttpError(400, 'Choose a valid status.', [{ field: 'status', message: 'Choose a valid status.' }])
  }

  const booking = await Booking.findByPk(req.params.id)
  if (!booking) throw new HttpError(404, 'Booking not found.')

  const changed = booking.status !== status || (note && note !== booking.adminNote)

  booking.status = status
  if (note) booking.adminNote = note
  if (status !== 'new') {
    booking.respondedAt = new Date()
    booking.respondedById = req.user.id
  }
  await booking.save()

  if (changed && (status === 'confirmed' || status === 'declined')) {
    sendBookingStatusEmail({ to: booking.email, booking, status, note }).catch((error) =>
      console.error('[emails] Booking status email failed:', error.message)
    )
  }

  const fresh = await Booking.findByPk(booking.id, { include: includes })
  res.json({ data: fresh })
})
