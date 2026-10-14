import { test, describe, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { app, request, resetDatabase, closeDatabase, createAdmin, signIn } from './helpers.js'
import { Subscriber } from '../src/models/index.js'

before(resetDatabase)
after(closeDatabase)

describe('newsletter double opt-in', () => {
  test('rejects a bad email', async () => {
    const response = await request(app).post('/api/newsletter').send({ email: 'nope' })
    assert.equal(response.status, 400)
  })

  test('stores the address as pending until the confirmation link is opened', async () => {
    const response = await request(app).post('/api/newsletter').send({ email: 'Ama@Example.com', name: 'Ama' })
    assert.equal(response.status, 202)
    assert.equal(response.body.data.status, 'pending')

    const row = await Subscriber.findOne({ where: { email: 'ama@example.com' } })
    assert.equal(row.status, 'pending')
    assert.equal(row.name, 'Ama')

    const confirm = await request(app).get(`/api/newsletter/confirm/${row.token}`)
    assert.equal(confirm.status, 302)
    assert.match(confirm.headers.location, /\/newsletter\/confirmed$/)

    await row.reload()
    assert.equal(row.status, 'subscribed')
    assert.ok(row.confirmedAt)

    const again = await request(app).post('/api/newsletter').send({ email: 'ama@example.com' })
    assert.equal(again.status, 200)
    assert.equal(again.body.data.alreadySubscribed, true)
  })

  test('unsubscribe link works and a bad token is handled', async () => {
    const row = await Subscriber.findOne({ where: { email: 'ama@example.com' } })
    const response = await request(app).get(`/api/newsletter/unsubscribe/${row.token}`)
    assert.equal(response.status, 302)
    assert.match(response.headers.location, /\/newsletter\/unsubscribed$/)

    await row.reload()
    assert.equal(row.status, 'unsubscribed')

    const bad = await request(app).get('/api/newsletter/confirm/not-a-token')
    assert.equal(bad.status, 302)
    assert.match(bad.headers.location, /\/newsletter\/invalid$/)
  })

  test('admins can list, count, export and delete subscribers', async () => {
    await request(app).post('/api/newsletter').send({ email: 'bea@example.com' })
    const bea = await Subscriber.findOne({ where: { email: 'bea@example.com' } })
    await request(app).get(`/api/newsletter/confirm/${bea.token}`)

    const agent = await signIn(await createAdmin())

    const list = await agent.get('/api/admin/subscribers')
    assert.equal(list.status, 200)
    assert.equal(list.body.meta.total, 2)
    assert.equal(list.body.data[0].token, undefined, 'tokens never leave the API')

    const counts = await agent.get('/api/admin/subscribers/counts')
    assert.equal(counts.body.data.subscribed, 1)
    assert.equal(counts.body.data.unsubscribed, 1)

    const csv = await agent.get('/api/admin/subscribers/export.csv')
    assert.equal(csv.status, 200)
    assert.match(csv.headers['content-type'], /text\/csv/)
    assert.match(csv.text, /^email,name,confirmed_at\n"bea@example.com"/)

    const removed = await agent.delete(`/api/admin/subscribers/${bea.id}`)
    assert.equal(removed.status, 204)

    const anon = await request(app).get('/api/admin/subscribers')
    assert.equal(anon.status, 401)
  })
})
