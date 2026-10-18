import http from 'node:http'
import crypto from 'node:crypto'
import { test, describe, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { app, request, resetDatabase, closeDatabase, createAdmin, signIn } from './helpers.js'
import { EventRegistration, User } from '../src/models/index.js'
import { testOutbox } from '../src/utils/mailer.js'
import { expireHolds, purgeHealthAnswers } from '../src/utils/events.js'

const API_KEY = 'sandbox-key-events'
const SECRET = 'wh_events_secret'
const mock = { requests: [], status: 'PENDING', n: 0 }
const server = http.createServer((req, res) => {
  let body = ''
  req.on('data', (c) => { body += c })
  req.on('end', () => {
    const json = (code, data) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(data)) }
    if (req.method === 'POST' && req.url === '/api/collections/initiate') {
      const parsed = JSON.parse(body); mock.requests.push(parsed); mock.n += 1
      return json(200, { success: 1, retcode: 0, refid: `RefEV${mock.n}`, tid: `t${mock.n}`, url: parsed.pmethod === 'cc' ? `https://pay.example/${mock.n}` : ' ', reply: 'ok' })
    }
    if (req.method === 'GET' && req.url.startsWith('/api/collections/status/')) return json(200, { status: mock.status })
    json(404, {})
  })
})
const sign = (raw) => `sha256=${crypto.createHmac('sha256', SECRET).update(raw).digest('hex')}`
const webhook = (ref, kind = 'COLLECTION_SUCCESSFUL') => {
  const raw = JSON.stringify({ event: kind, data: { refid: ref, status: kind === 'COLLECTION_SUCCESSFUL' ? 'SUCCESS' : 'FAILED' } })
  return request(app).post('/api/payments/xentripay/webhook').set('Content-Type', 'application/json').set('X-Xentripay-Signature', sign(raw)).send(raw)
}

let admin, adminUser, event
const person = (n, extra = {}) => ({ name: `Woman ${n}`, phone: '0788123456', email: `w${n}@example.com`, paymentMethod: 'momo', ...extra })

before(async () => {
  await resetDatabase()
  await new Promise((r) => server.listen(0, '127.0.0.1', r))
  process.env.XENTRIPAY_SANDBOX_URL = `http://127.0.0.1:${server.address().port}`
  adminUser = await createAdmin({ email: 'events-admin@example.com' })
  admin = await signIn(adminUser)
  await admin.put('/api/admin/settings').send({ xentripayApiKey: API_KEY, xentripayWebhookSecret: SECRET, xentripayEnvironment: 'sandbox', xentripayEnabled: true })
})
after(async () => { await new Promise((r) => server.close(r)); await closeDatabase() })

describe('events: everything set by the admin', () => {
  test('admin creates an event; it starts as a draft with the starter questions', async () => {
    const res = await admin.post('/api/admin/events').send({
      title: 'Her Wellness Experience 2026', date: '2026-11-07', price: 45000, totalPlaces: 3, picks: 2, ticketPrefix: 'hwe',
      venue: 'Mamba Sports Club, Kigali', startTime: '9:30', endTime: '14:30', dressCode: 'Leggings and trainers',
      activities: [{ name: 'Yoga', places: 2 }, { name: 'Reformer Pilates', places: 1 }, { name: 'Padel', places: 2 }],
    })
    assert.equal(res.status, 201, JSON.stringify(res.body))
    event = res.body.data
    assert.equal(event.status, 'draft')
    assert.equal(event.slug, 'her-wellness-experience-2026')
    assert.equal(event.ticketPrefix, 'HWE')
    assert.equal(event.activities.length, 3)
    assert.ok(event.questions.some((q) => q.sensitive), 'health questions are marked sensitive')
    assert.equal((await request(app).get(`/api/events/${event.slug}`)).status, 404, 'drafts are not public')
  })

  test('published: the page shows live places; the form validates answers', async () => {
    // Keep only one required question to make the tests readable.
    const upd = await admin.put(`/api/admin/events/${event.id}`).send({ status: 'open', questions: [
      { label: 'Age group', type: 'choice', options: ['18 to 24', '25 to 34'], required: true },
      { label: 'Anything we should know?', type: 'longtext', sensitive: true },
    ] })
    assert.equal(upd.status, 200, JSON.stringify(upd.body))
    event = upd.body.data
    const page = await request(app).get(`/api/events/${event.slug}`)
    assert.equal(page.body.data.state, 'open')
    assert.equal(page.body.data.placesLeft, 3)
    assert.deepEqual(page.body.data.activities.map((a) => a.left), [2, 1, 2])

    const missing = await request(app).post(`/api/events/${event.slug}/register`).send({ ...person(0), activityIds: [event.activities[0].id, event.activities[2].id] })
    assert.equal(missing.status, 400)
    assert.ok(missing.body.details.some((d) => d.field.startsWith('q_')))
  })

  test('register + pay: hold, webhook confirms once, ticket email with QR, no health data in it', async () => {
    const [yoga, reformer] = event.activities
    const age = event.questions[0].id, health = event.questions[1].id
    const res = await request(app).post(`/api/events/${event.slug}/register`).send({ ...person(1), activityIds: [yoga.id, reformer.id], answers: { [age]: '25 to 34', [health]: 'Knee injury' } })
    assert.equal(res.status, 201, JSON.stringify(res.body))
    assert.equal(res.body.data.status, 'holding')
    assert.equal(mock.requests.at(-1).amount, 45000)
    assert.equal(mock.requests.at(-1).chargesIncluded, true, 'organiser pays the fee by default: she pays exactly the price')

    const reg = await EventRegistration.findOne({ where: { token: res.body.data.token } })
    assert.ok(reg.healthAnswersEnc && !reg.healthAnswersEnc.includes('Knee'), 'health answers are encrypted at rest')

    assert.equal((await webhook(reg.paymentReference)).status, 200)
    assert.equal((await webhook(reg.paymentReference)).status, 200, 'a repeated webhook is harmless')
    const status = await request(app).get(`/api/events/registrations/${reg.token}`)
    assert.equal(status.body.data.status, 'confirmed')
    assert.equal(status.body.data.ticketNumber, 'HWE-0001')
    assert.deepEqual(status.body.data.activities.sort(), ['Reformer Pilates', 'Yoga'])
    await new Promise((r) => setTimeout(r, 50))
    const mail = testOutbox.filter((m) => m.to === 'w1@example.com')
    assert.equal(mail.length, 1, 'exactly one ticket email')
    assert.match(mail[0].html, /HWE-0001/)
    assert.match(mail[0].html, /qr\.png/)
    assert.ok(!mail[0].html.includes('Knee'), 'nothing medical in the email')
    assert.equal((await request(app).get(`/api/events/tickets/${reg.token}/qr.png`)).headers['content-type'], 'image/png')

    const page = await request(app).get(`/api/events/${event.slug}`)
    assert.equal(page.body.data.placesLeft, 2)
    assert.equal(page.body.data.activities.find((a) => a.id === reformer.id).left, 0, 'reformer now shows full')
  })

  test('a full activity cannot be picked; when only one is open she picks one', async () => {
    const [yoga, reformer, padel] = event.activities
    const age = event.questions[0].id
    const full = await request(app).post(`/api/events/${event.slug}/register`).send({ ...person(2), activityIds: [reformer.id, padel.id], answers: { [age]: '18 to 24' } })
    assert.equal(full.status, 409)
    assert.match(full.body.error, /Reformer Pilates has just filled/)
    assert.deepEqual(full.body.meta.fullActivityIds, [reformer.id])

    // Hide padel: only Yoga has space, so she must pick exactly one.
    await admin.put(`/api/admin/events/${event.id}`).send({ activities: [{ id: yoga.id, name: 'Yoga', places: 2 }, { id: reformer.id, name: 'Reformer Pilates', places: 1 }, { id: padel.id, name: 'Padel', places: 2, visible: false }] })
    const two = await request(app).post(`/api/events/${event.slug}/register`).send({ ...person(2), activityIds: [yoga.id, padel.id], answers: { [age]: '18 to 24' } })
    assert.equal(two.status, 400)
    const one = await request(app).post(`/api/events/${event.slug}/register`).send({ ...person(2), activityIds: [yoga.id], answers: { [age]: '18 to 24' } })
    assert.equal(one.status, 201, JSON.stringify(one.body))
  })

  test('two people, one last place: exactly one gets it', async () => {
    const [yoga, , padel] = event.activities
    await admin.put(`/api/admin/events/${event.id}`).send({ totalPlaces: 10, activities: [{ id: yoga.id, name: 'Yoga', places: 2 }, { id: event.activities[1].id, name: 'Reformer Pilates', places: 1 }, { id: padel.id, name: 'Padel', places: 3, visible: true }] })
    // Yoga has 2 places: 1 confirmed, 1 held by woman 2. Free it up so there is exactly one left on padel+yoga race.
    const age = event.questions[0].id
    const attempts = await Promise.all([3, 4, 5].map((n) => request(app).post(`/api/events/${event.slug}/register`).send({ ...person(n), activityIds: [padel.id], answers: { [age]: '18 to 24' } })))
    // picks is 2 but only padel is open alongside a full yoga? yoga still has woman 2's hold, so only padel is open: each picks one.
    const ok = attempts.filter((r) => r.status === 201).length
    assert.equal(ok, 3, attempts.map((r) => r.body.error).join(' | '))
    const fourth = await request(app).post(`/api/events/${event.slug}/register`).send({ ...person(6), activityIds: [padel.id], answers: { [age]: '18 to 24' } })
    assert.equal(fourth.status, 409, 'padel is now fully held')

    // Now a true race for one place.
    await admin.put(`/api/admin/events/${event.id}`).send({ activities: [{ id: yoga.id, name: 'Yoga', places: 2 }, { id: event.activities[1].id, name: 'Reformer Pilates', places: 1 }, { id: padel.id, name: 'Padel', places: 4 }] })
    const race = await Promise.all([7, 8].map((n) => request(app).post(`/api/events/${event.slug}/register`).send({ ...person(n), activityIds: [padel.id], answers: { [age]: '18 to 24' } })))
    assert.deepEqual(race.map((r) => r.status).sort(), [201, 409])
  })

  test('an abandoned hold expires and the place comes back; a late payment is confirmed if still free', async () => {
    const holding = await EventRegistration.findOne({ where: { email: 'w2@example.com', status: 'holding' } })
    await holding.update({ holdExpiresAt: new Date(Date.now() - 1000) })
    await expireHolds()
    assert.equal((await holding.reload()).status, 'expired')
    // She paid after all: yoga place still free, so she is confirmed.
    await webhook(holding.paymentReference)
    assert.equal((await holding.reload()).status, 'confirmed')
  })

  test('late payment when the place has gone is flagged for an admin, not double booked', async () => {
    const reg = await EventRegistration.findOne({ where: { email: 'w3@example.com' } })
    await reg.update({ status: 'expired' })
    const [, , padel] = event.activities
    await admin.put(`/api/admin/events/${event.id}`).send({ activities: [{ id: event.activities[0].id, name: 'Yoga', places: 2 }, { id: event.activities[1].id, name: 'Reformer Pilates', places: 1 }, { id: padel.id, name: 'Padel', places: 3 }] })
    await webhook(reg.paymentReference)
    assert.equal((await reg.reload()).status, 'attention')
    const detail = await admin.get(`/api/admin/events/${event.id}`)
    assert.equal(detail.body.data.stats.byStatus.attention, 1)
  })

  test('privacy: health answers only for medical accounts; deleted after the retention period', async () => {
    const reg = await EventRegistration.findOne({ where: { email: 'w1@example.com' } })
    const plain = await admin.get(`/api/admin/events/${event.id}/registrations/${reg.id}`)
    assert.equal(plain.body.data.hasHealthNote, true)
    assert.equal(plain.body.data.health, undefined, 'ordinary admins see only the marker')
    await admin.put(`/api/admin/admins/${adminUser.id}/clinical`).send({ isClinical: true })
    const clinical = await admin.get(`/api/admin/events/${event.id}/registrations/${reg.id}`)
    assert.equal(clinical.body.data.health[0].value, 'Knee injury')
    await User.update({ isClinical: false }, { where: { id: adminUser.id } })

    const csv = await admin.get(`/api/admin/events/${event.id}/export.csv`)
    assert.ok(!csv.text.includes('Knee'), 'the CSV never carries health answers')

    await admin.put(`/api/admin/events/${event.id}`).send({ date: '2020-01-01', healthRetentionDays: 30 })
    await purgeHealthAnswers()
    assert.equal((await reg.reload()).healthAnswersEnc, null)
    await admin.put(`/api/admin/events/${event.id}`).send({ date: '2026-11-07' })
  })

  test('admin tools: guest place, swap, cancel, roster, check-in, erase, duplicate', async () => {
    const [yoga, , padel] = event.activities
    const guest = await admin.post(`/api/admin/events/${event.id}/registrations`).send({ name: 'Partner Guest', phone: '0788000999', email: 'guest@example.com', activityIds: [] })
    assert.equal(guest.status, 201, JSON.stringify(guest.body))
    assert.equal(guest.body.data.status, 'confirmed')
    assert.match(guest.body.data.ticketNumber, /^HWE-/)

    const w1 = await EventRegistration.findOne({ where: { email: 'w1@example.com' } })
    const swap = await admin.put(`/api/admin/events/${event.id}/registrations/${w1.id}/activities`).send({ activityIds: [yoga.id, padel.id] })
    assert.ok([200, 409].includes(swap.status))

    const roster = await admin.get(`/api/admin/events/${event.id}/roster`)
    assert.ok(roster.body.data.groups.find((g) => g.name === 'Yoga').people.length >= 1)

    const look = await admin.get(`/api/admin/events/check-in/${w1.token}`)
    assert.equal(look.body.data.name, 'Woman 1')
    assert.equal((await admin.post(`/api/admin/events/check-in/${w1.token}`)).status, 200)

    const cancelled = await admin.post(`/api/admin/events/${event.id}/registrations/${guest.body.data.id}/cancel`)
    assert.equal(cancelled.body.data.status, 'cancelled')
    assert.equal((await admin.delete(`/api/admin/events/${event.id}/registrations/${guest.body.data.id}`)).status, 204)

    const copy = await admin.post(`/api/admin/events/${event.id}/duplicate`)
    assert.equal(copy.status, 201)
    assert.equal(copy.body.data.status, 'draft')
    assert.equal(copy.body.data.stats.confirmed, 0)
    assert.ok(copy.body.data.activities.length >= 2)
  })

  test('closing date and fully booked replace the form', async () => {
    await admin.put(`/api/admin/events/${event.id}`).send({ closesAt: new Date(Date.now() - 60000).toISOString() })
    assert.equal((await request(app).get(`/api/events/${event.slug}`)).body.data.state, 'closed')
    const late = await request(app).post(`/api/events/${event.slug}/register`).send({ ...person(9), activityIds: [] })
    assert.ok([400, 409].includes(late.status))
    await admin.put(`/api/admin/events/${event.id}`).send({ closesAt: null, totalPlaces: 1 })
    assert.equal((await request(app).get(`/api/events/${event.slug}`)).body.data.state, 'full')
    const list = await request(app).get('/api/events')
    assert.equal(list.body.data[0].state, 'full')
  })
})
