import { asyncHandler } from '../utils/asyncHandler.js'
import { HttpError } from '../utils/httpError.js'
import { sendContactNotificationEmail } from '../utils/emails.js'
import { ContactMessage } from '../models/index.js'

export const sendContactMessage = asyncHandler(async (req, res) => {
  const name = String(req.body?.name ?? '').trim()
  const email = String(req.body?.email ?? '').trim()
  const message = String(req.body?.message ?? '').trim()

  const details = []
  if (!name) details.push({ field: 'name', message: 'Name is required.' })
  if (!email || !email.includes('@')) details.push({ field: 'email', message: 'Enter a valid email.' })
  if (!message) details.push({ field: 'message', message: 'Message is required.' })

  if (details.length) {
    throw new HttpError(400, 'Please fill in every field.', details)
  }

  const saved = await ContactMessage.create({ name, email, message })

  const to = process.env.ADMIN_EMAIL

  if (to) {
    sendContactNotificationEmail({ to, name, email, message, messageId: saved.id }).catch((error) => {
      console.error('[emails] Contact notification failed:', error.message)
    })
  } else {
    console.log(`[contact] No ADMIN_EMAIL configured — message from ${name} <${email}>:\n${message}`)
  }

  res.status(204).end()
})
