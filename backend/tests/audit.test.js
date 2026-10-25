import { test, describe, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { app, request, resetDatabase, closeDatabase, createUser, createAdmin, signIn, createProduct } from './helpers.js'
import { AuditLog } from '../src/models/index.js'

let adminUser
let admin

before(async () => {
  await resetDatabase()
  adminUser = await createAdmin({ name: 'Ninette', email: 'ninette@example.com' })
  admin = await signIn(adminUser)
})

after(closeDatabase)

const latest = (where = {}) => AuditLog.findOne({ where, order: [['createdAt', 'DESC']] })
// Rows are written when the response finishes; give that a tick.
const settle = () => new Promise((resolve) => setTimeout(resolve, 50))

describe('Activity log', () => {
  test('sign-ins and failed sign-ins are recorded, for everyone', async () => {
    const login = await latest({ action: 'login', userId: adminUser.id })
    assert.equal(login.userName, 'Ninette')
    assert.equal(login.role, 'admin')

    const customer = await createUser({ email: 'ama@example.com' })
    await signIn(customer)
    assert.ok(await latest({ action: 'login', userId: customer.id }))

    await request(app).post('/api/auth/login').send({ email: 'ama@example.com', password: 'wrong-password' })
    const failed = await latest({ action: 'login_failed' })
    assert.equal(failed.userEmail, 'ama@example.com')
    assert.match(failed.summary, /Failed sign-in/)
  })

  test('an admin change is logged with the value before and after', async () => {
    const product = await createProduct({ name: 'She Strong Crop T-shirt', price: 25000 })
    const res = await admin.patch(`/api/admin/products/${product.id}`).send({ price: 27000 })
    assert.equal(res.status, 200)
    await settle()

    const row = await latest({ action: 'update', area: 'products' })
    assert.equal(row.userId, adminUser.id)
    assert.match(row.summary, /Changed product "She Strong Crop T-shirt": .*price/)
    const change = row.changes.find((c) => c.label === 'product')
    assert.deepEqual(change.fields.price, { before: '25000', after: '27000' })
  })

  test('secrets are never written to the log', async () => {
    await admin.put('/api/admin/settings').send({ xentripayApiKey: 'live-key-should-not-appear', momoNumber: '0788000111' })
    await settle()
    const row = await latest({ area: 'settings' })
    assert.ok(row, 'settings change is logged')
    assert.doesNotMatch(JSON.stringify(row.changes), /live-key-should-not-appear/)
  })

  test('failed or read-only admin requests are not logged', async () => {
    const before = await AuditLog.count()
    await admin.get('/api/admin/products')
    await admin.patch('/api/admin/products/00000000-0000-0000-0000-000000000000').send({ price: 1 })
    await settle()
    assert.equal(await AuditLog.count(), before)
  })

  test('sign-out is logged; only admins can read the log', async () => {
    const other = await signIn(await createAdmin({ name: 'Arnoldine', email: 'arnoldine@example.com' }))
    await other.post('/api/auth/logout')
    assert.ok(await latest({ action: 'logout', userEmail: 'arnoldine@example.com' }))

    const customer = await signIn(await createUser())
    assert.equal((await customer.get('/api/admin/activity')).status, 403)

    const list = await admin.get('/api/admin/activity').query({ kind: 'failed' })
    assert.equal(list.status, 200)
    assert.ok(list.body.data.every((r) => r.action === 'login_failed'))

    const mine = await admin.get('/api/admin/activity').query({ user: adminUser.id, kind: 'changes' })
    assert.ok(mine.body.data.length >= 2)

    const people = await admin.get('/api/admin/activity/people')
    assert.ok(people.body.data.people.some((p) => p.userName === 'Ninette'))
    assert.ok(people.body.data.areas.includes('products'))
  })
})
