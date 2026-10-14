import { test, describe, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { app, request, resetDatabase, closeDatabase, createUser, createAdmin, signIn, createProduct } from './helpers.js'
import { Order } from '../src/models/index.js'

before(resetDatabase)
after(closeDatabase)

const delivery = {
  customerName: 'Ama Uwase',
  customerPhone: '0788123456',
  address: 'KG 11 Ave, Kimihurura, Kigali'
}

describe('placing an order', () => {
  test('requires a signed-in customer', async () => {
    const response = await request(app).post('/api/orders').send({ ...delivery, items: [] })
    assert.equal(response.status, 401)
  })

  test('cash on delivery reserves stock, totals correctly, and shows up in my orders', async () => {
    const leggings = await createProduct({ price: 38000, stock: 5 })
    const journal = await createProduct({ price: 15000, stock: 2 })
    const agent = await signIn(await createUser())

    const response = await agent.post('/api/orders').send({
      ...delivery,
      items: [
        { productId: leggings.id, quantity: 2 },
        { productId: journal.id, quantity: 1 }
      ]
    })

    assert.equal(response.status, 201)
    const order = response.body.data
    assert.equal(order.total, 38000 * 2 + 15000)
    assert.equal(order.status, 'pending')
    assert.equal(order.paymentMethod, 'cod')
    assert.equal(order.items.length, 2)
    assert.equal(order.customerPhone, '+250788123456')
    assert.equal(response.body.clientSecret, null)

    await leggings.reload()
    await journal.reload()
    assert.equal(leggings.stock, 3)
    assert.equal(journal.stock, 1)

    const mine = await agent.get('/api/orders/my')
    assert.equal(mine.status, 200)
    assert.equal(mine.body.data.length, 1)
    assert.equal(mine.body.data[0].orderNumber, order.orderNumber)
  })

  test('refuses more than the stock and leaves stock untouched', async () => {
    const product = await createProduct({ stock: 1 })
    const agent = await signIn(await createUser())

    const response = await agent.post('/api/orders').send({ ...delivery, items: [{ productId: product.id, quantity: 2 }] })

    assert.equal(response.status, 409)
    await product.reload()
    assert.equal(product.stock, 1)
  })

  test('refuses unpublished products, empty carts and bad addresses', async () => {
    const hidden = await createProduct({ isPublished: false })
    const visible = await createProduct()
    const agent = await signIn(await createUser())

    const unpublished = await agent.post('/api/orders').send({ ...delivery, items: [{ productId: hidden.id, quantity: 1 }] })
    assert.equal(unpublished.status, 400)

    const empty = await agent.post('/api/orders').send({ ...delivery, items: [] })
    assert.equal(empty.status, 400)

    const badAddress = await agent.post('/api/orders').send({ ...delivery, address: 'x', items: [{ productId: visible.id, quantity: 1 }] })
    assert.equal(badAddress.status, 400)
    await visible.reload()
    assert.equal(visible.stock, 5, 'validation failure must roll back the stock decrement')
  })

  test('card payment without Stripe configured fails before any stock is reserved', async () => {
    const product = await createProduct({ stock: 4 })
    const user = await createUser()
    const agent = await signIn(user)

    const response = await agent.post('/api/orders').send({
      ...delivery,
      paymentMethod: 'card',
      items: [{ productId: product.id, quantity: 1 }]
    })

    assert.equal(response.status, 400)
    assert.match(response.body.error, /Card payment is not available/)
    await product.reload()
    assert.equal(product.stock, 4)
    assert.equal(await Order.count({ where: { userId: user.id } }), 0)
  })
})

describe('looking up an order', () => {
  test('owner, admin, or matching phone may view it; others may not', async () => {
    const product = await createProduct()
    const owner = await createUser()
    const ownerAgent = await signIn(owner)
    const placed = await ownerAgent.post('/api/orders').send({ ...delivery, items: [{ productId: product.id, quantity: 1 }] })
    const { orderNumber } = placed.body.data

    assert.equal((await ownerAgent.get(`/api/orders/${orderNumber}`)).status, 200)
    assert.equal((await request(app).get(`/api/orders/${orderNumber}`)).status, 403)
    assert.equal((await request(app).get(`/api/orders/${orderNumber}`).query({ phone: '0788123456' })).status, 200)
    assert.equal((await request(app).get(`/api/orders/${orderNumber}`).query({ phone: '0788999999' })).status, 403)

    const strangerAgent = await signIn(await createUser())
    assert.equal((await strangerAgent.get(`/api/orders/${orderNumber}`)).status, 403)

    const adminAgent = await signIn(await createAdmin())
    assert.equal((await adminAgent.get(`/api/orders/${orderNumber}`)).status, 200)

    assert.equal((await ownerAgent.get('/api/orders/NOPE-0000')).status, 404)
  })
})

describe('stripe webhook', () => {
  test('is rejected when Stripe is not configured', async () => {
    const response = await request(app)
      .post('/api/payments/stripe/webhook')
      .set('Content-Type', 'application/json')
      .send('{}')
    assert.equal(response.status, 400)
  })
})
