import { test, describe, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { app, request, resetDatabase, closeDatabase, createUser, createAdmin, signIn, createProduct } from './helpers.js'
import { Product } from '../src/models/index.js'

before(resetDatabase)
after(closeDatabase)

const delivery = { customerName: 'Ama Uwase', customerPhone: '0788123456', address: 'KG 11 Ave, Kimihurura, Kigali' }

let admin

describe('admin: every create, read, update and delete the dashboard offers', () => {
  before(async () => {
    admin = await signIn(await createAdmin())
  })

  test('categories can be created once and listed', async () => {
    const created = await admin.post('/api/admin/categories').send({ name: 'Activewear' })
    assert.equal(created.status, 201)
    assert.equal(created.body.data.slug, 'activewear')

    const duplicate = await admin.post('/api/admin/categories').send({ name: 'Activewear' })
    assert.equal(duplicate.status, 409)

    const blank = await admin.post('/api/admin/categories').send({ name: '  ' })
    assert.equal(blank.status, 400)

    const list = await admin.get('/api/admin/categories')
    assert.equal(list.body.data.length, 1)
  })

  test('products: create, read, update, images, publish rules, delete', async () => {
    const category = (await admin.get('/api/admin/categories')).body.data[0]

    const noImage = await admin
      .post('/api/admin/products')
      .send({ name: 'Leggings', price: 38000, categoryId: category.id, stock: 5, isPublished: true })
    assert.equal(noImage.status, 400, 'publishing needs an image')

    const created = await admin.post('/api/admin/products').send({
      name: 'Leggings',
      price: 38000,
      categoryId: category.id,
      stock: 5,
      isPublished: true,
      images: ['https://example.com/a.jpg', { url: 'https://example.com/b.jpg', color: 'Olive', colorHex: '#556b2f' }]
    })
    assert.equal(created.status, 201)
    const product = created.body.data
    assert.equal(product.slug, 'leggings')
    assert.equal(product.images.length, 2)
    assert.equal(product.category.name, 'Activewear')

    const visible = await request(app).get('/api/products/leggings')
    assert.equal(visible.status, 200)

    const updated = await admin
      .patch(`/api/admin/products/${product.id}`)
      .send({ price: 40000, stock: 7, description: 'Squat-proof, four-way stretch.' })
    assert.equal(updated.status, 200)
    assert.equal(updated.body.data.price, 40000)
    assert.equal(updated.body.data.stock, 7)

    const badPrice = await admin.patch(`/api/admin/products/${product.id}`).send({ price: -1 })
    assert.equal(badPrice.status, 400)

    const attached = await admin.post(`/api/admin/products/${product.id}/images`).send({ url: 'https://example.com/c.jpg' })
    assert.equal(attached.status, 201)

    const imageIds = (await admin.get(`/api/admin/products/${product.id}`)).body.data.images.map((image) => image.id)
    assert.equal(imageIds.length, 3)

    const reordered = await admin
      .patch(`/api/admin/products/${product.id}/images/order`)
      .send({ ids: [...imageIds].reverse() })
    assert.equal(reordered.status, 200)
    assert.equal(reordered.body.data[0].id, imageIds[2])

    const recolored = await admin
      .patch(`/api/admin/products/${product.id}/images/${imageIds[0]}`)
      .send({ color: 'Black', colorHex: '#000000' })
    assert.equal(recolored.status, 200)
    assert.equal(recolored.body.data.colorHex, '#000000')

    const badHex = await admin.patch(`/api/admin/products/${product.id}/images/${imageIds[0]}`).send({ colorHex: 'nope' })
    assert.equal(badHex.status, 400)

    assert.equal((await admin.delete(`/api/admin/products/${product.id}/images/${imageIds[0]}`)).status, 204)
    assert.equal((await admin.delete(`/api/admin/products/${product.id}/images/${imageIds[1]}`)).status, 204)
    const lastImage = await admin.delete(`/api/admin/products/${product.id}/images/${imageIds[2]}`)
    assert.equal(lastImage.status, 409, 'a published product keeps its last image')

    const unpublished = await admin.patch(`/api/admin/products/${product.id}`).send({ isPublished: false })
    assert.equal(unpublished.status, 200)
    assert.equal((await request(app).get('/api/products/leggings')).status, 404)

    assert.equal((await admin.delete(`/api/admin/products/${product.id}`)).status, 204)
    assert.equal((await admin.get(`/api/admin/products/${product.id}`)).status, 404)
  })

  test('a product in a past order cannot be deleted', async () => {
    const product = await createProduct({ name: 'Ordered item', stock: 5 })
    const customer = await signIn(await createUser())

    const placed = await customer.post('/api/orders').send({ ...delivery, items: [{ productId: product.id, quantity: 1 }] })
    assert.equal(placed.status, 201)

    const refused = await admin.delete(`/api/admin/products/${product.id}`)
    assert.equal(refused.status, 409)
  })

  test('orders: list, counts, detail, status transitions, restock on cancel', async () => {
    const list = await admin.get('/api/admin/orders')
    assert.equal(list.status, 200)
    assert.equal(list.body.meta.total, 1)
    const order = list.body.data[0]
    assert.equal(order.itemCount, 1)

    const counts = await admin.get('/api/admin/orders/counts')
    assert.equal(counts.body.data.pending, 1)

    const detail = await admin.get(`/api/admin/orders/${order.id}`)
    assert.equal(detail.status, 200)
    assert.equal(detail.body.data.items.length, 1)
    assert.ok(detail.body.data.user.email)

    const skipAhead = await admin.patch(`/api/admin/orders/${order.id}/status`).send({ status: 'delivered' })
    assert.equal(skipAhead.status, 409, 'pending cannot jump straight to delivered')

    for (const status of ['paid', 'shipped', 'delivered']) {
      const step = await admin.patch(`/api/admin/orders/${order.id}/status`).send({ status })
      assert.equal(step.status, 200, status)
      assert.equal(step.body.data.status, status)
    }

    const product = await Product.findOne({ where: { name: 'Ordered item' } })
    const stockBefore = product.stock

    const customer = await signIn(await createUser())
    const placed = await customer.post('/api/orders').send({ ...delivery, items: [{ productId: product.id, quantity: 2 }] })
    await product.reload()
    assert.equal(product.stock, stockBefore - 2)

    const cancelled = await admin.patch(`/api/admin/orders/${placed.body.data.id}/status`).send({ status: 'cancelled' })
    assert.equal(cancelled.status, 200)
    await product.reload()
    assert.equal(product.stock, stockBefore, 'cancelling a pending order puts the stock back')

    const search = await admin.get('/api/admin/orders').query({ search: 'Ama' })
    assert.equal(search.body.meta.total, 2)
  })

  test('programs: create with schedule, update, videos, delete', async () => {
    const created = await admin.post('/api/admin/programs').send({
      name: 'She Strong Classes',
      status: 'open',
      price: 45000,
      priceNote: 'per month',
      location: 'Fitnesspoint Kimihurura',
      coach: 'Coach Arnoldine',
      capacity: 15,
      highlights: ['All levels welcome'],
      schedule: [{ day: 'Monday', time: '06:30 – 07:30', note: 'Kimihurura' }, { day: '', time: '', note: '' }]
    })
    assert.equal(created.status, 201)
    const program = created.body.data
    assert.equal(program.slug, 'she-strong-classes')
    assert.equal(program.schedule.length, 1, 'blank schedule rows are dropped')
    assert.equal(program.price, 45000)

    const badStatus = await admin.post('/api/admin/programs').send({ name: 'X', status: 'weird' })
    assert.equal(badStatus.status, 400)

    const badCapacity = await admin.patch(`/api/admin/programs/${program.id}`).send({ capacity: 0 })
    assert.equal(badCapacity.status, 400)

    const first = await admin.post(`/api/admin/programs/${program.id}/videos`).send({ url: 'https://example.com/w1.mp4', title: 'Week 1' })
    const second = await admin.post(`/api/admin/programs/${program.id}/videos`).send({ url: 'https://example.com/w2.mp4', title: 'Week 2' })
    assert.equal(first.status, 201)
    assert.equal(second.status, 201)

    const reordered = await admin
      .patch(`/api/admin/programs/${program.id}/videos/order`)
      .send({ ids: [second.body.data.id, first.body.data.id] })
    assert.equal(reordered.status, 200)
    assert.equal(reordered.body.data[0].title, 'Week 2')

    const publicDetail = await request(app).get('/api/programs/she-strong-classes')
    assert.equal(publicDetail.status, 200)
    assert.equal(publicDetail.body.data.videos[0].title, 'Week 2')
    assert.equal(publicDetail.body.data.coach, 'Coach Arnoldine')

    const updated = await admin
      .patch(`/api/admin/programs/${program.id}`)
      .send({ status: 'coming_soon', capacity: 5, schedule: [], bookable: false })
    assert.equal(updated.status, 200)
    assert.equal(updated.body.data.status, 'coming_soon')
    assert.deepEqual(updated.body.data.schedule, [])
    assert.equal(updated.body.data.bookable, false)

    assert.equal((await admin.delete(`/api/admin/programs/${program.id}/videos/${first.body.data.id}`)).status, 204)
    assert.equal((await admin.delete(`/api/admin/programs/${program.id}`)).status, 204)
    assert.equal((await request(app).get('/api/programs/she-strong-classes')).status, 404)
  })

  test('posts: drafts, publish guard, scheduling, delete', async () => {
    const empty = await admin.post('/api/admin/posts').send({ title: 'Hello', isPublished: true })
    assert.equal(empty.status, 400, 'cannot publish an empty post')

    const draft = await admin.post('/api/admin/posts').send({ title: 'Five myths about lifting', body: 'Body text here.' })
    assert.equal(draft.status, 201)
    assert.equal(draft.body.data.isPublished, false)
    assert.equal(draft.body.data.excerpt, 'Body text here.')
    assert.equal(draft.body.data.author.name, 'Admin')

    assert.equal((await request(app).get('/api/posts')).body.meta.total, 0)

    const published = await admin.patch(`/api/admin/posts/${draft.body.data.id}`).send({ isPublished: true })
    assert.equal(published.status, 200)
    assert.ok(published.body.data.publishedAt)

    assert.equal((await request(app).get('/api/posts')).body.meta.total, 1)
    assert.equal((await request(app).get('/api/posts/five-myths-about-lifting')).status, 200)

    const scheduled = await admin
      .patch(`/api/admin/posts/${draft.body.data.id}`)
      .send({ publishedAt: '2099-01-01T06:00:00Z' })
    assert.equal(scheduled.status, 200)
    assert.equal((await request(app).get('/api/posts')).body.meta.total, 0, 'future posts stay hidden')

    const adminList = await admin.get('/api/admin/posts').query({ published: 'true' })
    assert.equal(adminList.body.meta.total, 1)

    assert.equal((await admin.delete(`/api/admin/posts/${draft.body.data.id}`)).status, 204)
    assert.equal((await admin.get(`/api/admin/posts/${draft.body.data.id}`)).status, 404)
  })

  test('site content: defaults, merged updates, array replacement', async () => {
    const current = await admin.get('/api/admin/home')
    assert.equal(current.status, 200)
    assert.ok(current.body.data.tips.length >= 1)
    assert.equal(current.body.data.contact.instagram, '@sheshape_wellness')

    const updated = await admin.put('/api/admin/home').send({
      hero: { title: 'New headline' },
      tips: [],
      team: [{ name: 'Arnoldine Urukundo', role: 'Co-founder', bio: '', imageUrl: '' }]
    })
    assert.equal(updated.status, 200)
    assert.equal(updated.body.data.hero.title, 'New headline')
    assert.ok(updated.body.data.hero.paragraph.length > 10, 'untouched fields keep their value')
    assert.deepEqual(updated.body.data.tips, [])
    assert.equal(updated.body.data.team[0].name, 'Arnoldine Urukundo')

    const publicContent = await request(app).get('/api/home-content')
    assert.equal(publicContent.body.data.hero.title, 'New headline')
  })

  test('messages: contact form in, admin reads and replies by email', async () => {
    const sent = await request(app)
      .post('/api/contact')
      .send({ name: 'Ama', email: 'ama@example.com', message: 'Do you run evening classes?' })
    assert.equal(sent.status, 204)

    const list = await admin.get('/api/admin/messages')
    assert.equal(list.body.meta.total, 1)
    assert.equal(list.body.data[0].status, 'new')
    const id = list.body.data[0].id

    assert.equal((await admin.get('/api/admin/messages/counts')).body.data.unread, 1)

    const detail = await admin.get(`/api/admin/messages/${id}`)
    assert.equal(detail.body.data.status, 'read', 'opening a message marks it read')

    const blank = await admin.post(`/api/admin/messages/${id}/reply`).send({ reply: '' })
    assert.equal(blank.status, 400)

    const replied = await admin.post(`/api/admin/messages/${id}/reply`).send({ reply: 'Yes, Tuesdays and Thursdays at 17:30.' })
    assert.equal(replied.status, 200)
    assert.equal(replied.body.data.status, 'replied')
    assert.equal(replied.body.data.repliedBy.name, 'Admin')
  })

  test('customers: list with order stats, detail, delete', async () => {
    const list = await admin.get('/api/admin/users')
    assert.equal(list.status, 200)
    const withOrders = list.body.data.find((row) => row.orderCount >= 1)
    assert.ok(withOrders, 'order counts are attached to customers')

    const detail = await admin.get(`/api/admin/users/${withOrders.id}`)
    assert.equal(detail.status, 200)
    assert.ok(Array.isArray(detail.body.data.orders))

    assert.equal((await admin.delete(`/api/admin/users/${withOrders.id}`)).status, 204)
    assert.equal((await admin.get(`/api/admin/users/${withOrders.id}`)).status, 404)

    const stillThere = await admin.get('/api/admin/orders')
    assert.equal(stillThere.body.meta.total, 2, 'orders survive a deleted customer')
  })

  test('payment settings, dashboard and search', async () => {
    const momo = await admin.put('/api/admin/settings').send({ momoNumber: '0788000111', momoName: 'She Shape' })
    assert.equal(momo.status, 200)
    assert.equal(momo.body.data.momoNumber, '+250788000111')

    const badMomo = await admin.put('/api/admin/settings').send({ momoNumber: '123' })
    assert.equal(badMomo.status, 400)

    const noKey = await admin.put('/api/admin/settings').send({ xentripayEnabled: true })
    assert.equal(noKey.status, 400, 'cannot enable online payment without a key')

    const withKey = await admin
      .put('/api/admin/settings')
      .send({ xentripayApiKey: 'sandbox-key-123', xentripayEnvironment: 'sandbox', xentripayEnabled: true })
    assert.equal(withKey.status, 200)
    assert.equal(withKey.body.data.hasXentripayApiKey, true)
    assert.equal(withKey.body.data.xentripayEnabled, true)

    const methods = await request(app).get('/api/payments/methods')
    assert.deepEqual(methods.body.data.xentripay, { environment: 'sandbox' })
    assert.equal(methods.body.data.momo.number, '+250788000111')

    const cleared = await admin.put('/api/admin/settings').send({ clearXentripay: true })
    assert.equal(cleared.body.data.xentripayEnabled, false)

    const dashboard = await admin.get('/api/admin/dashboard')
    assert.equal(dashboard.status, 200)
    assert.ok('bookings' in dashboard.body.data)
    assert.ok('subscribers' in dashboard.body.data)
    assert.equal(dashboard.body.data.orders.total, 2)

    const search = await admin.get('/api/admin/search').query({ q: 'Ama' })
    assert.equal(search.status, 200)
    assert.ok(search.body.data.orders.length >= 1)
  })
})
