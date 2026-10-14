import { test, describe, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { app, request, resetDatabase, closeDatabase, createUser, createAdmin, signIn } from './helpers.js'
import { Program, Booking } from '../src/models/index.js'

before(resetDatabase)
after(closeDatabase)

let program

describe('program booking requests', () => {
  before(async () => {
    program = await Program.create({
      name: 'She Strong Classes',
      slug: 'she-strong-classes',
      status: 'open',
      price: 45000,
      priceNote: 'per month',
      schedule: [{ day: 'Monday', time: '06:30', note: 'Kimihurura' }]
    })
  })

  test('programs expose the practical details', async () => {
    const response = await request(app).get('/api/programs/she-strong-classes')
    assert.equal(response.status, 200)
    assert.equal(response.body.data.price, 45000)
    assert.equal(response.body.data.bookable, true)
    assert.deepEqual(response.body.data.schedule, [{ day: 'Monday', time: '06:30', note: 'Kimihurura' }])
  })

  test('validates the request and stores it with the program name', async () => {
    const missing = await request(app).post('/api/bookings').send({ programId: program.id, name: 'Ama' })
    assert.equal(missing.status, 400)
    assert.ok(missing.body.details.some((item) => item.field === 'phone'))

    const response = await request(app).post('/api/bookings').send({
      programId: program.id,
      name: 'Ama Uwase',
      email: 'ama@example.com',
      phone: '0788123456',
      preferredDate: '2026-11-03',
      message: 'Mornings only please.'
    })

    assert.equal(response.status, 201)
    assert.equal(response.body.data.status, 'new')
    assert.equal(response.body.data.programName, 'She Strong Classes')
    assert.equal(response.body.data.phone, '+250788123456')
  })

  test('a general enquiry works without a program, and unknown programs are refused', async () => {
    const general = await request(app).post('/api/bookings').send({
      name: 'Bea',
      email: 'bea@example.com',
      phone: '0788123457'
    })
    assert.equal(general.status, 201)
    assert.equal(general.body.data.programName, 'General enquiry')

    const unknown = await request(app).post('/api/bookings').send({
      programId: '00000000-0000-4000-8000-000000000000',
      name: 'Bea',
      email: 'bea@example.com',
      phone: '0788123457'
    })
    assert.equal(unknown.status, 404)
  })

  test('programs can close requests', async () => {
    await program.update({ bookable: false })
    const response = await request(app).post('/api/bookings').send({
      programId: program.id,
      name: 'Cia',
      email: 'cia@example.com',
      phone: '0788123458'
    })
    assert.equal(response.status, 400)
    await program.update({ bookable: true })
  })

  test('signed-in customers see their own requests', async () => {
    const user = await createUser({ email: 'ama@example.com' })
    const agent = await signIn(user)

    const mine = await agent.get('/api/bookings/my')
    assert.equal(mine.status, 200)
    assert.equal(mine.body.data.length, 1, 'matched by email even when made while logged out')
    assert.equal(mine.body.data[0].adminNote, undefined)
  })

  test('admins triage requests and the customer is told', async () => {
    const agent = await signIn(await createAdmin())

    const list = await agent.get('/api/admin/bookings')
    assert.equal(list.status, 200)
    assert.equal(list.body.meta.total, 2)
    assert.equal(list.body.data[0].status, 'new')

    const counts = await agent.get('/api/admin/bookings/counts')
    assert.equal(counts.body.data.new, 2)

    const booking = await Booking.findOne({ where: { email: 'ama@example.com' } })
    const confirmed = await agent
      .patch(`/api/admin/bookings/${booking.id}/status`)
      .send({ status: 'confirmed', note: 'See you Monday at 06:30.' })
    assert.equal(confirmed.status, 200)
    assert.equal(confirmed.body.data.status, 'confirmed')
    assert.equal(confirmed.body.data.adminNote, 'See you Monday at 06:30.')
    assert.ok(confirmed.body.data.respondedAt)

    const bad = await agent.patch(`/api/admin/bookings/${booking.id}/status`).send({ status: 'nope' })
    assert.equal(bad.status, 400)

    const anon = await request(app).get('/api/admin/bookings')
    assert.equal(anon.status, 401)
  })
})
