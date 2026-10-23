import { Op } from 'sequelize'
import { asyncHandler } from '../utils/asyncHandler.js'
import { HttpError } from '../utils/httpError.js'
import { Booking, Program } from '../models/index.js'
import { sendBookingReceivedEmail, sendBookingNotificationEmail } from '../utils/emails.js'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

/** A customer asks to join a program. Admins confirm by hand. */
export const createBooking = asyncHandler(async (req, res) => {
  const body = req.body ?? {}
  const name = String(body.name ?? '').trim()
  const email = String(body.email ?? '').trim().toLowerCase()
  const phone = String(body.phone ?? '').trim()
  const message = String(body.message ?? '').trim().slice(0, 2000)
  const preferredDate = String(body.preferredDate ?? '').trim()
  const programId = String(body.programId ?? '').trim()

  const details = []
  if (!name) details.push({ field: 'name', message: 'Name is required.' })
  if (!email) details.push({ field: 'email', message: 'Email is required.' })
  if (!phone) details.push({ field: 'phone', message: 'Phone number is required.' })
  if (preferredDate && !DATE_PATTERN.test(preferredDate)) {
    details.push({ field: 'preferredDate', message: 'Use the date picker.' })
  }
  if (details.length) throw new HttpError(400, 'Please fill in every required field.', details)

  let program = null
  if (programId) {
    if (!UUID_PATTERN.test(programId)) throw new HttpError(404, 'Program not found.')
    program = await Program.findByPk(programId)
    if (!program) throw new HttpError(404, 'Program not found.')
    if (!program.bookable) throw new HttpError(400, 'This program is not taking requests right now.')
  }

  const booking = await Booking.create({
    programId: program?.id ?? null,
    programName: program?.name ?? 'General enquiry',
    userId: req.user?.id ?? null,
    name,
    email,
    phone,
    preferredDate: preferredDate || null,
    message
  })

  sendBookingReceivedEmail({ to: booking.email, booking }).catch((error) =>
    console.error('[emails] Booking acknowledgement failed:', error.message)
  )

  const adminTo = process.env.ADMIN_EMAIL
  if (adminTo) {
    sendBookingNotificationEmail({ to: adminTo, booking }).catch((error) =>
      console.error('[emails] Booking notification failed:', error.message)
    )
  }

  res.status(201).json({ data: booking })
})

/** Bookings made by the signed-in customer (by account or by their email). */
export const listMyBookings = asyncHandler(async (req, res) => {
  const bookings = await Booking.findAll({
    where: { [Op.or]: [{ userId: req.user.id }, { email: req.user.email }] },
    attributes: { exclude: ['adminNote', 'respondedById'] },
    order: [['createdAt', 'DESC']]
  })

  res.json({ data: bookings })
})
