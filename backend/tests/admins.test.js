import { test, describe, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { app, request, resetDatabase, closeDatabase, createAdmin, createUser, signIn } from './helpers.js'
import { testOutbox } from '../src/utils/mailer.js'
import { User } from '../src/models/index.js'

before(resetDatabase)
after(closeDatabase)

const tokenFrom = (email) => {
  const mail = [...testOutbox].reverse().find((m) => m.to === email)
  return mail?.html.match(/\/invite\/([0-9a-f]{64})/)?.[1]
}

describe('admin invites', () => {
  let admin, adminUser

  before(async () => {
    adminUser = await createAdmin({ email: 'owner@example.com' })
    admin = await signIn(adminUser)
  })

  test('invite a new person: email link, accept with a password, lands as admin', async () => {
    const sent = await admin.post('/api/admin/admins/invites').send({ email: 'New.Coach@example.com', name: 'Coach' })
    assert.equal(sent.status, 201, JSON.stringify(sent.body))

    const token = tokenFrom('new.coach@example.com')
    assert.ok(token, 'invite email carries a link')

    const info = await request(app).get(`/api/auth/invites/${token}`)
    assert.equal(info.status, 200)
    assert.deepEqual(info.body.data, { email: 'new.coach@example.com', name: 'Coach', hasAccount: false })

    const agent = request.agent(app)
    const accepted = await agent.post(`/api/auth/invites/${token}/accept`).send({ name: 'Coach Ana', phone: '0788222333', password: 'strongpass123' })
    assert.equal(accepted.status, 200, JSON.stringify(accepted.body))
    assert.equal(accepted.body.data.role, 'admin')
    assert.equal((await agent.get('/api/admin/check')).status, 200, 'signed in as admin straight away')

    const again = await request(app).post(`/api/auth/invites/${token}/accept`).send({ password: 'strongpass123' })
    assert.equal(again.status, 404, 'links work once')
  })

  test('an existing customer accepts with their own password and keeps their account', async () => {
    const customer = await createUser({ email: 'member@example.com' })
    await admin.post('/api/admin/admins/invites').send({ email: 'member@example.com' })
    const token = tokenFrom('member@example.com')

    assert.equal((await request(app).get(`/api/auth/invites/${token}`)).body.data.hasAccount, true)
    const wrong = await request(app).post(`/api/auth/invites/${token}/accept`).send({ password: 'not-it-at-all' })
    assert.equal(wrong.status, 401)
    const ok = await request(app).post(`/api/auth/invites/${token}/accept`).send({ password: 'password123' })
    assert.equal(ok.status, 200)
    assert.equal((await User.findByPk(customer.id)).role, 'admin')
  })

  test('list, resend, revoke, and remove admin rights', async () => {
    await admin.post('/api/admin/admins/invites').send({ email: 'later@example.com' })
    let list = await admin.get('/api/admin/admins')
    const pending = list.body.data.invites.find((i) => i.email === 'later@example.com')
    assert.ok(pending)
    const firstToken = tokenFrom('later@example.com')

    assert.equal((await admin.post(`/api/admin/admins/invites/${pending.id}/resend`)).status, 200)
    assert.notEqual(tokenFrom('later@example.com'), firstToken, 'resend issues a fresh link')
    assert.equal((await request(app).get(`/api/auth/invites/${firstToken}`)).status, 404, 'old link stops working')

    assert.equal((await admin.delete(`/api/admin/admins/invites/${pending.id}`)).status, 204)

    list = await admin.get('/api/admin/admins')
    const coach = list.body.data.admins.find((a) => a.email === 'new.coach@example.com')
    assert.equal((await admin.delete(`/api/admin/admins/${coach.id}`)).status, 204)
    assert.equal((await User.findByPk(coach.id)).role, 'user')

    assert.equal((await admin.delete(`/api/admin/admins/${adminUser.id}`)).status, 400, 'cannot remove yourself')
    assert.equal((await admin.post('/api/admin/admins/invites').send({ email: 'owner@example.com' })).status, 409)
  })

  test('customers cannot see or send invites', async () => {
    const customer = await signIn(await createUser())
    assert.equal((await customer.get('/api/admin/admins')).status, 403)
    assert.equal((await request(app).get('/api/auth/invites/' + 'f'.repeat(64))).status, 404)
  })
})
