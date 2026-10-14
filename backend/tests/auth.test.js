import { test, describe, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { app, request, resetDatabase, closeDatabase, createUser, createAdmin, signIn, plantOtp } from './helpers.js'
import { User, OtpCode } from '../src/models/index.js'

before(resetDatabase)
after(closeDatabase)

const registration = (overrides = {}) => ({
  name: 'Ama Uwase',
  email: 'ama@example.com',
  phone: '0788123456',
  password: 'password123',
  ...overrides
})

describe('registration and email verification', () => {
  test('register creates an unverified user and starts OTP verification', async () => {
    const agent = request.agent(app)
    const response = await agent.post('/api/auth/register').send(registration())

    assert.equal(response.status, 201)
    assert.equal(response.body.data.pendingVerification, true)

    const user = await User.findOne({ where: { email: 'ama@example.com' } })
    assert.equal(user.isVerified, false)
    assert.equal(await OtpCode.count({ where: { userId: user.id, purpose: 'verify_email' } }), 1)

    const me = await agent.get('/api/auth/me')
    assert.equal(me.status, 200)
    assert.equal(me.body.data, null, 'no session until the email is verified')
  })

  test('rejects duplicate emails and bad phone numbers', async () => {
    const duplicate = await request(app).post('/api/auth/register').send(registration())
    assert.equal(duplicate.status, 409)

    const badPhone = await request(app)
      .post('/api/auth/register')
      .send(registration({ email: 'other@example.com', phone: '12345' }))
    assert.equal(badPhone.status, 400)
  })

  test('the right code signs the user in, the wrong one does not', async () => {
    const agent = request.agent(app)
    await agent.post('/api/auth/register').send(registration({ email: 'bea@example.com', phone: '0788123457' }))
    const user = await User.findOne({ where: { email: 'bea@example.com' } })
    await plantOtp(user, 'verify_email', '123456')

    const wrong = await agent.post('/api/auth/verify-email').send({ code: '000000' })
    assert.equal(wrong.status, 400)

    const right = await agent.post('/api/auth/verify-email').send({ code: '123456' })
    assert.equal(right.status, 200)
    assert.equal(right.body.data.isVerified, true)
    assert.equal(right.body.data.passwordHash, undefined, 'hash never leaves the API')

    const me = await agent.get('/api/auth/me')
    assert.equal(me.status, 200)
    assert.equal(me.body.data.email, 'bea@example.com')
  })
})

describe('login and sessions', () => {
  test('rejects a wrong password without revealing which part was wrong', async () => {
    const user = await createUser()
    const response = await request(app).post('/api/auth/login').send({ email: user.email, password: 'nope-nope' })
    assert.equal(response.status, 401)
  })

  test('a verified user gets a session cookie and can log out', async () => {
    const user = await createUser()
    const agent = await signIn(user)

    const me = await agent.get('/api/auth/me')
    assert.equal(me.status, 200)
    assert.equal(me.body.data.id, user.id)

    await agent.post('/api/auth/logout')
    const after = await agent.get('/api/auth/me')
    assert.equal(after.status, 200)
    assert.equal(after.body.data, null)
  })

  test('an unverified user is sent back to verification instead of signed in', async () => {
    const user = await createUser({ isVerified: false })
    const response = await request(app).post('/api/auth/login').send({ email: user.email, password: 'password123' })
    assert.equal(response.status, 200)
    assert.equal(response.body.data.pendingVerification, true)
  })

  test('password reset with a planted code', async () => {
    const user = await createUser()

    const forgot = await request(app).post('/api/auth/forgot-password').send({ email: user.email })
    assert.equal(forgot.status, 204)

    await plantOtp(user, 'reset_password', '654321')
    const reset = await request(app)
      .post('/api/auth/reset-password')
      .send({ email: user.email, code: '654321', newPassword: 'brand-new-pass' })
    assert.equal(reset.status, 204)

    const old = await request(app).post('/api/auth/login').send({ email: user.email, password: 'password123' })
    assert.equal(old.status, 401)
    const fresh = await request(app).post('/api/auth/login').send({ email: user.email, password: 'brand-new-pass' })
    assert.equal(fresh.status, 200)
  })
})

describe('admin guard', () => {
  test('anonymous requests get 401', async () => {
    const response = await request(app).get('/api/admin/check')
    assert.equal(response.status, 401)
  })

  test('customers get 403', async () => {
    const agent = await signIn(await createUser())
    const response = await agent.get('/api/admin/check')
    assert.equal(response.status, 403)
  })

  test('admins get through', async () => {
    const agent = await signIn(await createAdmin())
    const response = await agent.get('/api/admin/check')
    assert.equal(response.status, 200)
    assert.deepEqual(response.body.data, { ok: true })
  })
})

// Keep this last: once the limiter trips, every auth route in this process returns 429.
describe('rate limiting', () => {
  test('repeated login attempts from one IP are cut off', async () => {
    const limit = Number(process.env.AUTH_RATE_LIMIT_MAX)
    let last

    for (let attempt = 0; attempt <= limit; attempt += 1) {
      last = await request(app).post('/api/auth/login').send({ email: 'nobody@example.com', password: 'x' })
      if (last.status === 429) break
    }

    assert.equal(last.status, 429)
    assert.match(last.body.error, /Too many attempts/)
  })
})
