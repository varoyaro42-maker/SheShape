import fs from 'node:fs'
import path from 'node:path'
import { test, describe, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { app, request, resetDatabase, closeDatabase, createAdmin, createUser, signIn } from './helpers.js'

before(async () => {
  await resetDatabase()
  fs.rmSync(process.env.UPLOADS_DIR, { recursive: true, force: true })
})
after(closeDatabase)

const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64')

describe('local file storage', () => {
  test('admin prepares then posts an image, and it is served back', async () => {
    const admin = await signIn(await createAdmin())

    const prep = await admin.post('/api/admin/uploads/prepare').send({ kind: 'home', contentType: 'image/png', size: png.length })
    assert.equal(prep.status, 200)
    assert.equal(prep.body.data.method, 'POST')
    assert.equal(prep.body.data.uploadUrl, '/api/admin/uploads/file?kind=home')

    const sent = await admin.post(prep.body.data.uploadUrl).attach('file', png, { filename: 'dot.png', contentType: 'image/png' })
    assert.equal(sent.status, 201, JSON.stringify(sent.body))
    assert.match(sent.body.data.url, /^\/uploads\/home\/[0-9a-f-]{36}\.png$/)

    const onDisk = path.join(process.env.UPLOADS_DIR, sent.body.data.url.replace('/uploads/', ''))
    assert.ok(fs.existsSync(onDisk), 'file written under UPLOADS_DIR')

    const served = await request(app).get(sent.body.data.url)
    assert.equal(served.status, 200)
    assert.match(served.headers['content-type'], /image\/png/)
    assert.match(served.headers['cache-control'], /immutable/)
  })

  test('rejects wrong types, wrong kinds and visitors', async () => {
    const admin = await signIn(await createAdmin({ email: 'admin2@example.com' }))

    const badType = await admin.post('/api/admin/uploads/prepare').send({ kind: 'home', contentType: 'image/gif', size: 10 })
    assert.equal(badType.status, 400)

    const avatarViaAdmin = await admin.post('/api/admin/uploads/file?kind=avatar').attach('file', png, { filename: 'a.png', contentType: 'image/png' })
    assert.equal(avatarViaAdmin.status, 400)

    const exe = await admin.post('/api/admin/uploads/file?kind=home').attach('file', Buffer.from('MZ'), { filename: 'x.exe', contentType: 'application/octet-stream' })
    assert.equal(exe.status, 400)

    const anon = await request(app).post('/api/admin/uploads/file?kind=home').attach('file', png, { filename: 'a.png', contentType: 'image/png' })
    assert.equal(anon.status, 401)
  })

  test('a customer uploads an avatar to their own account and it is accepted', async () => {
    const agent = await signIn(await createUser())

    const sent = await agent.post('/api/users/me/avatar/file?kind=avatar').attach('file', png, { filename: 'me.png', contentType: 'image/png' })
    assert.equal(sent.status, 201)
    assert.match(sent.body.data.url, /^\/uploads\/avatars\//)

    const saved = await agent.patch('/api/users/me/avatar').send({ url: sent.body.data.url })
    assert.equal(saved.status, 200)
    assert.equal(saved.body.data.avatarUrl, sent.body.data.url)

    const elsewhere = await agent.patch('/api/users/me/avatar').send({ url: '/uploads/home/not-mine.png' })
    assert.equal(elsewhere.status, 400)
  })

  test('site content: files removed or replaced in the content are deleted from disk', async () => {
    const admin = await signIn(await createAdmin({ email: 'admin4@example.com' }))
    const upload = async () => {
      const sent = await admin.post('/api/admin/uploads/file?kind=home').attach('file', png, { filename: 'g.png', contentType: 'image/png' })
      assert.equal(sent.status, 201)
      return { url: sent.body.data.url, file: path.join(process.env.UPLOADS_DIR, sent.body.data.url.replace('/uploads/', '')) }
    }
    const first = await upload()
    const second = await upload()

    let res = await admin.put('/api/admin/home').send({ gallery: [{ imageUrl: first.url, caption: '', href: '' }] })
    assert.equal(res.status, 200)
    assert.ok(fs.existsSync(first.file), 'kept while referenced')

    res = await admin.put('/api/admin/home').send({ gallery: [{ imageUrl: second.url, caption: '', href: '' }] })
    assert.equal(res.status, 200)
    await new Promise((resolve) => setTimeout(resolve, 80))
    assert.ok(!fs.existsSync(first.file), 'replaced file removed')
    assert.ok(fs.existsSync(second.file), 'new file kept')

    res = await admin.put('/api/admin/home').send({ gallery: [] })
    assert.equal(res.status, 200)
    await new Promise((resolve) => setTimeout(resolve, 80))
    assert.ok(!fs.existsSync(second.file), 'removed file deleted')
  })

  test('deleting a customer removes their avatar file', async () => {
    const user = await createUser()
    const agent = await signIn(user)
    const sent = await agent.post('/api/users/me/avatar/file?kind=avatar').attach('file', png, { filename: 'me.png', contentType: 'image/png' })
    assert.equal(sent.status, 201)
    const saved = await agent.patch('/api/users/me/avatar').send({ url: sent.body.data.url })
    assert.equal(saved.status, 200)
    const onDisk = path.join(process.env.UPLOADS_DIR, sent.body.data.url.replace('/uploads/', ''))
    assert.ok(fs.existsSync(onDisk))

    const admin = await signIn(await createAdmin({ email: 'admin5@example.com' }))
    const res = await admin.delete(`/api/admin/users/${user.id}`)
    assert.equal(res.status, 204, JSON.stringify(res.body))
    await new Promise((resolve) => setTimeout(resolve, 80))
    assert.ok(!fs.existsSync(onDisk), 'avatar removed with the account')
  })

  test('site content accepts local upload paths and a landing video', async () => {
    const admin = await signIn(await createAdmin({ email: 'admin3@example.com' }))
    const res = await admin.put('/api/admin/home').send({
      hero: { videoUrl: '/uploads/videos/abc.mp4', videoPoster: 'javascript:alert(1)' },
      partners: [{ name: 'Fitnesspoint', imageUrl: '/uploads/home/fp.png', href: 'https://fitnesspoint.rw' }]
    })
    assert.equal(res.status, 200)
    assert.equal(res.body.data.hero.videoUrl, '/uploads/videos/abc.mp4')
    assert.equal(res.body.data.hero.videoPoster, '', 'script urls are stripped from poster too')
    assert.equal(res.body.data.partners[0].imageUrl, '/uploads/home/fp.png')
  })
})
