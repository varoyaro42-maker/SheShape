import http from 'node:http'
import crypto from 'node:crypto'
import { test, describe, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { app, request, resetDatabase, closeDatabase, createUser, createAdmin, signIn, createProduct } from './helpers.js'
import { Order, Product } from '../src/models/index.js'

const delivery = { customerName: 'Ama Uwase', customerPhone: '0788123456', address: 'KG 11 Ave, Kimihurura, Kigali' }
const API_KEY = 'sandbox-key-abc'
const WEBHOOK_SECRET = 'wh_sec_test_123'

// A stand-in for merchant.test.xentripay.com that follows the integration pack.
const mock = { requests: [], status: 'PENDING', initiate: null, lastRef: 0 }

const server = http.createServer((req, res) => {
  let body = ''
  req.on('data', (chunk) => { body += chunk })
  req.on('end', () => {
    const json = (code, data) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(data)) }
    if (req.headers['x-xentripay-key'] !== API_KEY) return json(401, { status: 401, message: 'Invalid or disabled API key' })

    if (req.method === 'POST' && req.url === '/api/collections/initiate') {
      const parsed = JSON.parse(body)
      mock.requests.push({ path: req.url, body: parsed })
      if (mock.initiate) return json(200, mock.initiate)
      mock.lastRef += 1
      const refid = `RefTEST${String(mock.lastRef).padStart(4, '0')}`
      return json(200, {
        reply: parsed.pmethod === 'cc' ? 'Continue to process Card Payment' : 'Check your pending transactions on 182*7*1#',
        url: parsed.pmethod === 'cc' ? `https://urubutopay.rw/pay-now/card/process/${mock.lastRef}` : null,
        success: 1,
        authkey: 'authkey',
        tid: `tid${mock.lastRef}`,
        refid,
        retcode: 0
      })
    }

    const status = req.url.match(/^\/api\/collections\/status\/([^/]+)$/)
    if (req.method === 'GET' && status) {
      mock.requests.push({ path: req.url })
      return json(200, { customerRef: decodeURIComponent(status[1]), rid: 'RefTEST0001', status: mock.status, updatedAt: new Date().toISOString() })
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
  const saved = await admin
    .put('/api/admin/settings')
    .send({ xentripayApiKey: API_KEY, xentripayEnvironment: 'sandbox', xentripayEnabled: true, momoNumber: '0788000111' })
  assert.equal(saved.status, 200)
})

after(async () => {
  await new Promise((resolve) => server.close(resolve))
  await closeDatabase()
})

const sign = (raw) => `sha256=${crypto.createHmac('sha256', WEBHOOK_SECRET).update(raw).digest('hex')}`

describe('XentriPay collections', () => {
  test('when XentriPay is on, mobile money and card both go through it', async () => {
    const methods = await request(app).get('/api/payments/methods')
    assert.deepEqual(methods.body.data.momo, { provider: 'xentripay' })
    assert.deepEqual(methods.body.data.card, { provider: 'xentripay' })
  })

  test('a MoMo order sends a push prompt with the right fields, then polls to paid', async () => {
    const product = await createProduct({ price: 12500, stock: 3 })
    const user = await createUser({ email: 'ama@example.com' })
    const agent = await signIn(user)

    mock.status = 'PENDING'
    const placed = await agent.post('/api/orders').send({ ...delivery, paymentMethod: 'momo', items: [{ productId: product.id, quantity: 1 }] })
    assert.equal(placed.status, 201, JSON.stringify(placed.body))
    const order = placed.body.data
    assert.equal(order.paymentProvider, 'xentripay')
    assert.equal(order.paymentAttempts, 1)
    assert.match(order.paymentReference, /^RefTEST/)
    assert.equal(placed.body.payment.prompt, true)
    assert.match(placed.body.payment.message, /182\*7\*1#/)

    const sent = mock.requests.find((r) => r.path === '/api/collections/initiate').body
    assert.equal(sent.pmethod, 'momo')
    assert.equal(sent.amount, 12500)
    assert.equal(sent.currency, 'RWF')
    assert.equal(sent.cnumber, '0788123456')
    assert.equal(sent.msisdn, '250788123456')
    assert.equal(sent.customerRef, order.orderNumber)
    assert.equal(sent.cname, 'Ama Uwase')
    assert.equal(sent.email, 'ama@example.com')
    assert.equal(sent.chargesIncluded, true)
    assert.equal(sent.redirecturl, undefined)

    const pending = await agent.get(`/api/payments/orders/${order.orderNumber}`)
    assert.equal(pending.body.data.paymentStatus, 'pending')

    mock.status = 'SUCCESS'
    const paid = await agent.get(`/api/payments/orders/${order.orderNumber}`)
    assert.equal(paid.body.data.paymentStatus, 'paid')
    assert.equal(paid.body.data.status, 'paid')

    const stored = await Order.findByPk(order.id)
    assert.equal(stored.status, 'paid')
    assert.ok(stored.paidAt)
  })

  test('a card order returns the gateway url with redirect fields set', async () => {
    const product = await createProduct({ price: 20000, stock: 3 })
    const agent = await signIn(await createUser())

    mock.requests.length = 0
    const placed = await agent.post('/api/orders').send({ ...delivery, paymentMethod: 'card', items: [{ productId: product.id, quantity: 1 }] })
    assert.equal(placed.status, 201, JSON.stringify(placed.body))
    assert.equal(placed.body.data.paymentMethod, 'card')
    assert.match(placed.body.payment.checkoutUrl, /urubutopay\.rw/)
    assert.equal(placed.body.payment.prompt, false)

    const sent = mock.requests[0].body
    assert.equal(sent.pmethod, 'cc')
    assert.match(sent.redirecturl, new RegExp(`/dashboard/order/${placed.body.data.orderNumber}$`))
    assert.match(sent.returl, new RegExp(`/dashboard/order/${placed.body.data.orderNumber}$`))
  })

  test('a rejected prompt releases the order and stock', async () => {
    const product = await createProduct({ price: 15000, stock: 2 })
    const user = await createUser()
    const agent = await signIn(user)

    mock.initiate = { reply: 'Payment failed. Check that the phone number is correct', url: null, success: 0, retcode: 606 }
    const placed = await agent.post('/api/orders').send({ ...delivery, paymentMethod: 'momo', items: [{ productId: product.id, quantity: 1 }] })
    mock.initiate = null

    assert.equal(placed.status, 502)
    assert.match(placed.body.error, /prompt/)
    await product.reload()
    assert.equal(product.stock, 2)
    assert.equal(await Order.count({ where: { userId: user.id } }), 0)
  })

  test('totals under 100 RWF cannot go online', async () => {
    const product = await createProduct({ price: 50, stock: 5 })
    const agent = await signIn(await createUser())
    const placed = await agent.post('/api/orders').send({ ...delivery, paymentMethod: 'momo', items: [{ productId: product.id, quantity: 1 }] })
    assert.equal(placed.status, 400)
    assert.match(placed.body.error, /at least 100 RWF/)
    await product.reload()
    assert.equal(product.stock, 5, 'nothing reserved')
  })

  test('a failed attempt can be retried with a new customerRef', async () => {
    const product = await createProduct({ price: 30000, stock: 3 })
    const agent = await signIn(await createUser())

    mock.status = 'PENDING'
    const placed = await agent.post('/api/orders').send({ ...delivery, paymentMethod: 'momo', items: [{ productId: product.id, quantity: 1 }] })
    const { orderNumber } = placed.body.data

    mock.status = 'FAILED'
    const failed = await agent.get(`/api/payments/orders/${orderNumber}`)
    assert.equal(failed.body.data.paymentStatus, 'failed')

    mock.status = 'PENDING'
    mock.requests.length = 0
    const retried = await agent.post(`/api/payments/orders/${orderNumber}/retry`)
    assert.equal(retried.status, 200, JSON.stringify(retried.body))
    assert.equal(retried.body.data.attempts, 2)
    assert.equal(retried.body.data.paymentStatus, 'pending')
    const reinit = mock.requests.find((r) => r.path === '/api/collections/initiate')
    assert.equal(reinit.body.customerRef, `${orderNumber}-2`)
    assert.equal(reinit.body.pmethod, 'momo')

    const cod = await agent.post(`/api/payments/orders/NOPE-0000/retry`)
    assert.equal(cod.status, 404)
  })

  test('a signed COLLECTION_SUCCESSFUL webhook marks the order paid', async () => {
    const saved = await admin.put('/api/admin/settings').send({ xentripayWebhookSecret: WEBHOOK_SECRET })
    assert.equal(saved.body.data.hasXentripayWebhookSecret, true)

    const product = await createProduct({ price: 18000, stock: 3 })
    const agent = await signIn(await createUser())
    mock.status = 'PENDING'
    const placed = await agent.post('/api/orders').send({ ...delivery, paymentMethod: 'momo', items: [{ productId: product.id, quantity: 1 }] })
    const order = placed.body.data

    const payload = JSON.stringify({
      event: 'COLLECTION_SUCCESSFUL',
      data: { id: 9871, amount: 18000, currency: 'RWF', status: 'SUCCESSFUL', reference: order.paymentReference, businessAccountId: 123 },
      timestamp: new Date().toISOString(),
      idempotencyKey: 'COLLECTION_SUCCESSFUL:123:test'
    })

    const forged = await request(app)
      .post('/api/payments/xentripay/webhook')
      .set('Content-Type', 'application/json')
      .set('X-Xentripay-Signature', 'sha256=deadbeef')
      .send(payload)
    assert.equal(forged.status, 401)
    assert.equal((await Order.findByPk(order.id)).status, 'pending')

    const genuine = await request(app)
      .post('/api/payments/xentripay/webhook')
      .set('Content-Type', 'application/json')
      .set('X-Xentripay-Signature', sign(payload))
      .set('X-Xentripay-Event', 'COLLECTION_SUCCESSFUL')
      .send(payload)
    assert.equal(genuine.status, 200)
    assert.deepEqual(genuine.body, { received: true })
    assert.equal((await Order.findByPk(order.id)).status, 'paid')

    // Delivered twice: still 200, still paid once.
    const again = await request(app).post('/api/payments/xentripay/webhook').set('Content-Type', 'application/json').set('X-Xentripay-Signature', sign(payload)).send(payload)
    assert.equal(again.status, 200)

    // Unknown events are acknowledged so XentriPay does not retry them.
    const other = JSON.stringify({ event: 'PAYOUT_SUCCESS', data: { id: 1 } })
    const ignored = await request(app).post('/api/payments/xentripay/webhook').set('Content-Type', 'application/json').set('X-Xentripay-Signature', sign(other)).send(other)
    assert.equal(ignored.status, 200)
  })

  test('a webhook can also match by customerRef on a retried order', async () => {
    const product = await createProduct({ price: 9000, stock: 3 })
    const agent = await signIn(await createUser())
    mock.status = 'PENDING'
    const placed = await agent.post('/api/orders').send({ ...delivery, paymentMethod: 'momo', items: [{ productId: product.id, quantity: 1 }] })
    const { orderNumber, id } = placed.body.data

    const payload = JSON.stringify({ event: 'COLLECTION_SUCCESSFUL', data: { customerRef: `${orderNumber}-2`, status: 'SUCCESSFUL' } })
    const res = await request(app).post('/api/payments/xentripay/webhook').set('Content-Type', 'application/json').set('X-Xentripay-Signature', sign(payload)).send(payload)
    assert.equal(res.status, 200)
    assert.equal((await Order.findByPk(id)).status, 'paid')
  })

  test('turning XentriPay off falls back to the manual MoMo number', async () => {
    const off = await admin.put('/api/admin/settings').send({ xentripayEnabled: false })
    assert.equal(off.status, 200)
    const methods = await request(app).get('/api/payments/methods')
    assert.equal(methods.body.data.momo.provider, 'manual')
    assert.equal(methods.body.data.momo.number, '+250788000111')
    assert.equal(methods.body.data.card, null)
  })

  test('with no key saved in admin, XENTRIPAY_* environment variables take over', async () => {
    const cleared = await admin.put('/api/admin/settings').send({ clearXentripay: true })
    assert.equal(cleared.status, 200)
    assert.equal(cleared.body.data.hasXentripayApiKey, false)

    process.env.XENTRIPAY_API_KEY = API_KEY
    process.env.XENTRIPAY_WEBHOOK_SECRET = 'env-secret'
    process.env.XENTRIPAY_ENVIRONMENT = 'sandbox'
    try {
      const settings = await admin.get('/api/admin/settings')
      assert.equal(settings.body.data.xentripaySource, 'env')
      assert.equal(settings.body.data.hasXentripayApiKey, true)
      assert.equal(settings.body.data.hasXentripayWebhookSecret, true)

      const methods = await request(app).get('/api/payments/methods')
      assert.equal(methods.body.data.momo.provider, 'xentripay')
      assert.equal(methods.body.data.card.provider, 'xentripay')

      // The env secret is what signs webhooks now.
      const product = await createProduct({ price: 7000, stock: 2 })
      const agent = await signIn(await createUser())
      mock.status = 'PENDING'
      const placed = await agent.post('/api/orders').send({ ...delivery, paymentMethod: 'momo', items: [{ productId: product.id, quantity: 1 }] })
      assert.equal(placed.status, 201, JSON.stringify(placed.body))
      const payload = JSON.stringify({ event: 'COLLECTION_SUCCESSFUL', data: { customerRef: placed.body.data.orderNumber, status: 'SUCCESS' } })
      const signature = 'sha256=' + crypto.createHmac('sha256', 'env-secret').update(payload).digest('hex')
      const res = await request(app).post('/api/payments/xentripay/webhook').set('Content-Type', 'application/json').set('X-Xentripay-Signature', signature).send(payload)
      assert.equal(res.status, 200)
      assert.equal((await Order.findByPk(placed.body.data.id)).status, 'paid')

      process.env.XENTRIPAY_ENABLED = 'false'
      const off = await request(app).get('/api/payments/methods')
      assert.equal(off.body.data.momo.provider, 'manual')
    } finally {
      delete process.env.XENTRIPAY_API_KEY
      delete process.env.XENTRIPAY_WEBHOOK_SECRET
      delete process.env.XENTRIPAY_ENVIRONMENT
      delete process.env.XENTRIPAY_ENABLED
    }
  })
})
