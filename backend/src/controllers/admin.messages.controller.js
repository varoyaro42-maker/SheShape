import { Op } from 'sequelize'
import { asyncHandler } from '../utils/asyncHandler.js'
import { HttpError } from '../utils/httpError.js'
import { ContactMessage, User, sequelize } from '../models/index.js'
import { sendContactReplyEmail } from '../utils/emails.js'

const MAX_LIMIT = 50
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const withRepliedBy = {
  model: User,
  as: 'repliedBy',
  attributes: ['id', 'name']
}

export const list = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1)
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(req.query.limit) || 20))
  const where = {}

  const status = String(req.query.status || '').trim()
  if (status) where.status = status

  const search = String(req.query.search || '').trim()
  if (search) {
    where[Op.or] = [
      { name: { [Op.like]: `%${search}%` } },
      { email: { [Op.like]: `%${search}%` } },
      { message: { [Op.like]: `%${search}%` } }
    ]
  }

  const { rows, count } = await ContactMessage.findAndCountAll({
    where,
    order: [
      [sequelize.literal("`ContactMessage`.`status` = 'new'"), 'DESC'],
      ['createdAt', 'DESC']
    ],
    limit,
    offset: (page - 1) * limit
  })

  res.json({
    data: rows,
    meta: { page, limit, total: count, pages: Math.ceil(count / limit) || 1 }
  })
})

export const counts = asyncHandler(async (req, res) => {
  const unread = await ContactMessage.count({ where: { status: 'new' } })
  res.json({ data: { unread } })
})

export const detail = asyncHandler(async (req, res) => {
  if (!UUID_PATTERN.test(String(req.params.id))) throw new HttpError(404, 'Message not found.')

  const message = await ContactMessage.findByPk(req.params.id, { include: [withRepliedBy] })
  if (!message) throw new HttpError(404, 'Message not found.')

  if (message.status === 'new') {
    message.status = 'read'
    await message.save()
  }

  res.json({ data: message })
})

export const reply = asyncHandler(async (req, res) => {
  if (!UUID_PATTERN.test(String(req.params.id))) throw new HttpError(404, 'Message not found.')

  const replyMessage = String(req.body?.reply ?? '').trim()

  if (!replyMessage) {
    throw new HttpError(400, 'Write a reply before sending.', [
      { field: 'reply', message: 'Reply is required.' }
    ])
  }

  const message = await ContactMessage.findByPk(req.params.id)
  if (!message) throw new HttpError(404, 'Message not found.')

  await sendContactReplyEmail({
    to: message.email,
    name: message.name,
    originalMessage: message.message,
    reply: replyMessage
  })

  message.status = 'replied'
  message.replyMessage = replyMessage
  message.repliedAt = new Date()
  message.repliedById = req.user.id
  await message.save()

  const fresh = await ContactMessage.findByPk(message.id, { include: [withRepliedBy] })

  res.json({ data: fresh })
})
