import http from 'node:http'
import crypto from 'node:crypto'
import { test, describe, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { app, request, resetDatabase, closeDatabase, createUser, createAdmin, signIn } from './helpers.js'
import { Event, EventRegistration, Order, Payout } from '../src/models/index.js'

const API_KEY = 'sandbox-key-payouts'

// A stand-in for merchant.test.xentripay.com, payouts section of the API documentation.
const mock = { requests: [], initiate: null, providerStatus: 'PENDING', lastId: 2800 }

const server = http.createServer((req, res) => {
  let body = ''
  req.on('data', (chunk) => { body += chunk })
  req.on('end', () => {
    const json = (code, data) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(data)) }
    if (req.headers['x-xentripay-key'] !== API_KEY) return json(401, { status: 401, message: 'Invalid or disabled API key' })

    if (req.method === 'POST' && req.url === '/api/payment-requests') {
      const parsed = JSON.parse(body)
      mock.requests.push({ path: req.url, body: parsed })
      if (mock.initiate) return mock.initiate(json, parsed)
      mock.lastId += 1
      return json(200, {
        id: mock.lastId,
        businessName: 'She Shape Wellness',
        customerReference: parsed.customerReference,
        telecomProvider: 'MTN MOBILE MONEY',
        telecomProviderId: parsed.telecomProviderId,
        msisdn: parsed.msisdn,
        transactionType: 'PAYOUT',
        currency: 'RWF',
        amount: parsed.amount,
        txnCharge: 10.0,
        status: 'PENDING',
        statusMessage: 'Payment request submitted to eKash successfully, awaiting confirmation.',
        internalRef: 'Ref42FCC70F46DD',
        validatedAccountName: parsed.name,
        externalTransactionRef: null
      })
    }

    if (req.method === 'GET' && req.url.startsWith('/api/payment-requests/check-status?customerRef=')) {
      mock.requests.push({ path: req.url })
      return json(200, { timestamp: '2026-10-25 10:42:52', message: 'Success', data: { status: mock.providerStatus, reference_number: '0046', amount: '500.0' } })
    }

    json(404, { message: 'Not found' })
  })
})

let admin

before(async () => {
  await resetDatabase()
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  process.env.XENTRIPAY_SANDBOX_URL = `http://127.0.0.1:${server.address().port}`

  admin = await signIn(await createAdmin())
  const saved = await admin.put('/api/admin/settings').send({ xentripayApiKey: API_KEY, xentripayEnvironment: 'sandbox', xentripayEnabled: true })
  assert.equal(saved.status, 200)
})

after(async () => {
  await new Promise((resolve) => server.close(resolve))
  await closeDatabase()
})

async function seedPayments() {
  const paidAt = new Date()
  await Order.create({ orderNumber: 'SSW-P1', customerName: 'Ama Uwase', customerPhone: '0788123456', address: 'KG 11 Ave, Kigali', total: 25000, status: 'paid', paymentMethod: 'momo', paymentProvider: 'xentripay', paymentReference: 'RefA', paidAt })
  // Not counted: cash on delivery, and an online order still unpaid.
  await Order.create({ orderNumber: 'SSW-P2', customerName: 'Keza Mugisha', customerPhone: '0788123457', address: 'KG 11 Ave, Kigali', total: 9000, status: 'paid', paymentMethod: 'cod', paidAt })
  await Order.create({ orderNumber: 'SSW-P3', customerName: 'Ines Ishimwe', customerPhone: '0788123458', address: 'KG 11 Ave, Kigali', total: 7000, paymentMethod: 'card', paymentProvider: 'xentripay', paymentReference: 'RefB' })
  // Paid in sandbox testing, then cancelled: not money in the wallet.
  await Order.create({ orderNumber: 'SSW-P4', customerName: 'Test Order', customerPhone: '0788123459', address: 'KG 11 Ave, Kigali', total: 25000, status: 'cancelled', paymentMethod: 'momo', paymentProvider: 'xentripay', paymentReference: 'RefD', paidAt })

  const event = await Event.create({ title: 'Her Wellness Experience', slug: 'her-wellness', date: '2026-11-07', venue: 'Mamba', price: 45000, totalPlaces: 80 })
  await EventRegistration.create({ eventId: event.id, name: 'Aline Uwera', phone: '+250788000222', email: 'aline@example.com', amount: 45000, status: 'confirmed', paymentMethod: 'momo', paymentReference: 'RefC', paidAt })
  // Added by an admin: no money came through XentriPay.
  await EventRegistration.create({ eventId: event.id, name: 'Guest', phone: '+250788000333', email: 'guest@example.com', amount: 45000, status: 'confirmed', source: 'admin', paidAt })
}

describe('Payments and payouts', () => {
  test('only admins can see the money', async () => {
    const customer = await signIn(await createUser())
    assert.equal((await customer.get('/api/admin/payouts/summary')).status, 403)
    assert.equal((await request(app).get('/api/admin/payouts/summary')).status, 401)
  })

  test('the summary adds up online orders and tickets only', async () => {
    await seedPayments()

    const res = await admin.get('/api/admin/payouts/summary')
    assert.equal(res.status, 200)
    // The organiser pays the ticket fee (3% taken off); the customer pays it on shop orders.
    assert.equal(res.body.data.count, 2)
    assert.equal(res.body.data.received, 70000)
    assert.equal(res.body.data.fees, 1350)
    assert.equal(res.body.data.net, 68650)
    assert.equal(res.body.data.estimatedBalance, 68650)
    const shop = res.body.data.bySource.find((s) => s.source === 'shop')
    const event = res.body.data.bySource.find((s) => s.label === 'Her Wellness Experience')
    assert.deepEqual([shop.count, shop.amount, shop.fee], [1, 25000, 0])
    assert.deepEqual([event.count, event.amount, event.fee, event.net], [1, 45000, 1350, 43650])
    assert.equal(res.body.data.ready, true)
    assert.ok(res.body.data.providers.some((p) => p.id === '63510'))

    const list = await admin.get('/api/admin/payouts/received')
    const ticket = list.body.data.find((r) => r.kind === 'ticket')
    assert.deepEqual([ticket.amount, ticket.fee, ticket.net, ticket.phone, ticket.sourceLabel], [45000, 1350, 43650, '+250788000222', 'Her Wellness Experience'])
    assert.equal(list.body.data.length, 2)
  })

  test('a payout goes to XentriPay in the documented format and waits for the OTP', async () => {
    mock.requests = []
    const res = await admin.post('/api/admin/payouts').send({ providerId: '63510', account: '+250 788 302 208', name: 'Arnoldine Urukundo', amount: 20000, note: 'Coach fees' })

    assert.equal(res.status, 201)
    assert.equal(res.body.data.status, 'pending')
    assert.equal(res.body.data.charge, 10)
    assert.equal(res.body.data.account, '0788302208')

    const sent = mock.requests.find((r) => r.path === '/api/payment-requests').body
    assert.equal(sent.telecomProviderId, '63510')
    assert.equal(sent.msisdn, '0788302208')
    assert.equal(sent.transactionType, 'PAYOUT')
    assert.equal(sent.currency, 'RWF')
    assert.equal(sent.amount, 20000)
    assert.equal(sent.customerReference, res.body.data.reference)

    const summary = await admin.get('/api/admin/payouts/summary')
    assert.equal(summary.body.data.waiting, 20010)
    assert.equal(summary.body.data.estimatedBalance, 68650 - 20010)
  })

  test('checking the status moves it to paid out', async () => {
    const payout = await Payout.findOne({ where: { status: 'pending' } })
    mock.providerStatus = 'COMPLETED'

    const res = await admin.post(`/api/admin/payouts/${payout.id}/refresh`)
    assert.equal(res.status, 200)
    assert.equal(res.body.data.status, 'successful')
    assert.ok(mock.requests.some((r) => r.path === `/api/payment-requests/check-status?customerRef=${payout.reference}`))

    const summary = await admin.get('/api/admin/payouts/summary')
    assert.equal(summary.body.data.paidOut, 20010)
    assert.equal(summary.body.data.waiting, 0)
  })

  test('bad input is refused before anything is sent', async () => {
    mock.requests = []
    const cases = [
      { providerId: '99999', account: '0788302208', name: 'A Person', amount: 1000 },
      { providerId: '63510', account: '12345', name: 'A Person', amount: 1000 },
      { providerId: '63510', account: '0788302208', name: 'A Person', amount: 50 },
      { providerId: '63510', account: '0788302208', name: 'A Person', amount: 100.5 },
      { providerId: '040', account: 'abc', name: 'A Person', amount: 1000 },
      { providerId: '63510', account: '0788302208', name: '', amount: 1000 }
    ]
    for (const body of cases) assert.equal((await admin.post('/api/admin/payouts').send(body)).status, 400, JSON.stringify(body))
    assert.equal(mock.requests.length, 0)
  })

  test('a bank payout sends the account number', async () => {
    mock.requests = []
    const res = await admin.post('/api/admin/payouts').send({ providerId: '040', account: '100-0123 4567', name: 'She Shape Wellness Ltd', amount: 5000 })
    assert.equal(res.status, 201)
    assert.equal(mock.requests[0].body.msisdn, '10001234567')
    assert.equal(mock.requests[0].body.telecomProviderId, '040')
  })

  test('when XentriPay refuses, the payout is kept as failed and not counted', async () => {
    mock.initiate = (json) => json(400, { status: 400, message: 'Insufficient balance' })
    const before = (await admin.get('/api/admin/payouts/summary')).body.data

    const res = await admin.post('/api/admin/payouts').send({ providerId: '63514', account: '0738000111', name: 'A Person', amount: 999999 })
    mock.initiate = null

    assert.equal(res.status, 422)
    assert.match(res.body.error, /Insufficient balance/)
    const failed = await Payout.findOne({ where: { amount: 999999 } })
    assert.equal(failed.status, 'failed')

    const after = (await admin.get('/api/admin/payouts/summary')).body.data
    assert.equal(after.estimatedBalance, before.estimatedBalance)

    const list = await admin.get('/api/admin/payouts')
    const shown = list.body.data.find((p) => p.amount === 999999)
    assert.equal(shown.status, 'failed')
    assert.equal(shown.createdBy.name, 'Admin')
  })

  test('payout webhooks: OTP note, then success, only with a valid signature', async () => {
    const secret = 'wh_payout_secret'
    await admin.put('/api/admin/settings').send({ xentripayWebhookSecret: secret })
    const created = await admin.post('/api/admin/payouts').send({ providerId: '63510', account: '0788302209', name: 'Coach Ninette', amount: 15000 })
    const payout = created.body.data

    const post = (body, sig) => {
      const raw = JSON.stringify(body)
      return request(app)
        .post('/api/payments/xentripay/webhook')
        .set('Content-Type', 'application/json')
        .set('X-Xentripay-Signature', sig ?? `sha256=${crypto.createHmac('sha256', secret).update(raw).digest('hex')}`)
        .send(raw)
    }

    const otp = await post({ event: 'SINGLEPAYOUTCREATEDPENDINGOTP', data: { id: Number(payout.xentripayId), reference: payout.reference, status: 'PENDING' } })
    assert.equal(otp.status, 200)
    assert.match((await Payout.findByPk(payout.id)).statusMessage, /OTP/)

    const forged = await post({ event: 'PAYOUT_SUCCESS', data: { reference: payout.reference, status: 'SUCCESSFUL' } }, 'sha256=bad')
    assert.equal(forged.status, 401)
    assert.equal((await Payout.findByPk(payout.id)).status, 'pending')

    const done = await post({ event: 'PAYOUT_SUCCESS', data: { id: Number(payout.xentripayId), amount: 15000, status: 'SUCCESSFUL', reference: payout.reference } })
    assert.equal(done.status, 200)
    const fresh = await Payout.findByPk(payout.id)
    assert.equal(fresh.status, 'successful')
    assert.ok(fresh.completedAt)

    // A late failure for a payout already sent changes nothing.
    await post({ event: 'PAYMENT_REQUEST_FAILED', data: { reference: payout.reference } })
    assert.equal((await Payout.findByPk(payout.id)).status, 'successful')
  })
})
