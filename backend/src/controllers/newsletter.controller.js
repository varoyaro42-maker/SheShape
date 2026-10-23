import { asyncHandler } from '../utils/asyncHandler.js'
import { HttpError } from '../utils/httpError.js'
import { Subscriber } from '../models/index.js'
import { newSubscriberToken } from '../models/Subscriber.js'
import { addSubscriberToBrevo, removeSubscriberFromBrevo } from '../utils/brevo.js'
import { sendNewsletterConfirmEmail, clientUrl } from '../utils/emails.js'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function syncToBrevo(subscriber) {
  addSubscriberToBrevo({ email: subscriber.email, name: subscriber.name })
    .then((synced) => {
      if (!synced) return null
      subscriber.brevoSyncedAt = new Date()
      return subscriber.save()
    })
    .catch((error) => console.error('[brevo] Could not add', subscriber.email, error.message))
}

/**
 * Double opt-in: the address is stored as pending and only counts once the
 * confirmation link in the email is opened. Keeps the list clean and keeps
 * Brevo happy about deliverability.
 */
export const subscribe = asyncHandler(async (req, res) => {
  const email = String(req.body?.email ?? '').trim().toLowerCase()
  const name = String(req.body?.name ?? '').trim().slice(0, 80)

  if (!EMAIL_PATTERN.test(email)) {
    throw new HttpError(400, 'Enter a valid email address.', [{ field: 'email', message: 'Enter a valid email.' }])
  }

  let subscriber = await Subscriber.findOne({ where: { email } })

  if (subscriber?.status === 'subscribed') {
    return res.json({ data: { status: 'subscribed', alreadySubscribed: true } })
  }

  if (subscriber) {
    subscriber.token = newSubscriberToken()
    subscriber.status = 'pending'
    if (name) subscriber.name = name
    await subscriber.save()
  } else {
    subscriber = await Subscriber.create({ email, name: name || null, status: 'pending' })
  }

  await sendNewsletterConfirmEmail({
    to: subscriber.email,
    name: subscriber.name,
    confirmUrl: clientUrl(`/api/newsletter/confirm/${subscriber.token}`)
  })

  res.status(202).json({ data: { status: 'pending' } })
})

export const confirm = asyncHandler(async (req, res) => {
  const subscriber = await Subscriber.findOne({ where: { token: String(req.params.token ?? '') } })

  if (!subscriber) {
    return res.redirect(clientUrl('/newsletter/invalid'))
  }

  if (subscriber.status !== 'subscribed') {
    subscriber.status = 'subscribed'
    subscriber.confirmedAt = new Date()
    subscriber.unsubscribedAt = null
    await subscriber.save()
    syncToBrevo(subscriber)
  }

  res.redirect(clientUrl('/newsletter/confirmed'))
})

export const unsubscribe = asyncHandler(async (req, res) => {
  const subscriber = await Subscriber.findOne({ where: { token: String(req.params.token ?? '') } })

  if (!subscriber) {
    return res.redirect(clientUrl('/newsletter/invalid'))
  }

  if (subscriber.status !== 'unsubscribed') {
    subscriber.status = 'unsubscribed'
    subscriber.unsubscribedAt = new Date()
    await subscriber.save()
    removeSubscriberFromBrevo({ email: subscriber.email }).catch((error) =>
      console.error('[brevo] Could not remove', subscriber.email, error.message)
    )
  }

  res.redirect(clientUrl('/newsletter/unsubscribed'))
})
