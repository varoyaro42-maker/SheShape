import { test, describe, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { app, request, resetDatabase, closeDatabase, createAdmin, createUser, signIn } from './helpers.js'
import { safeUrl, sanitizeUrls } from '../src/utils/safeUrl.js'

before(resetDatabase)
after(closeDatabase)

describe('security', () => {
  test('safeUrl keeps http(s) and site paths and drops script urls', () => {
    assert.equal(safeUrl('https://example.com/a.jpg'), 'https://example.com/a.jpg')
    assert.equal(safeUrl('/app-demo.html'), '/app-demo.html')
    assert.equal(safeUrl('javascript:alert(1)'), '')
    assert.equal(safeUrl(' JaVaScRiPt:alert(1)'), '')
    assert.equal(safeUrl('data:text/html,<script>alert(1)</script>'), '')
    assert.equal(safeUrl('//evil.example/x'), '')
    assert.deepEqual(sanitizeUrls({ gallery: [{ href: 'javascript:x', caption: 'javascript:is fine as text' }] }), {
      gallery: [{ href: '', caption: 'javascript:is fine as text' }]
    })
  })

  test('site content cannot store javascript links', async () => {
    const admin = await signIn(await createAdmin())
    const res = await admin.put('/api/admin/home').send({
      app: { demoUrl: 'javascript:alert(document.cookie)' },
      gallery: [{ imageUrl: 'https://example.com/p.jpg', href: 'javascript:alert(1)', caption: 'x' }]
    })
    assert.equal(res.status, 200)
    assert.equal(res.body.data.app.demoUrl, '')
    assert.equal(res.body.data.gallery[0].href, '')
    assert.equal(res.body.data.gallery[0].imageUrl, 'https://example.com/p.jpg')
  })

  test('avatars must come from our own bucket', async () => {
    const agent = await signIn(await createUser())
    const outside = await agent.patch('/api/users/me/avatar').send({ url: 'https://evil.example/tracker.png' })
    assert.equal(outside.status, 400)
  })

  test('responses carry a strict content security policy', async () => {
    const res = await request(app).get('/api/health')
    const csp = res.headers['content-security-policy']
    assert.match(csp, /script-src 'self'/)
    assert.match(csp, /object-src 'none'/)
    assert.match(csp, /frame-ancestors 'self'/)
    assert.equal(res.headers['x-content-type-options'], 'nosniff')
  })

  test('admin routes reject customers and visitors', async () => {
    assert.equal((await request(app).put('/api/admin/home').send({})).status, 401)
    const customer = await signIn(await createUser())
    assert.equal((await customer.put('/api/admin/settings').send({ xentripayEnabled: true })).status, 403)
    assert.equal((await customer.get('/api/admin/subscribers/export.csv')).status, 403)
  })

  test('secrets never leave the API', async () => {
    const admin = await signIn(await createAdmin())
    await admin.put('/api/admin/settings').send({ xentripayApiKey: 'live-secret-key-value', xentripayWebhookSecret: 'wh_sec_value' })
    const settings = await admin.get('/api/admin/settings')
    const text = JSON.stringify(settings.body)
    assert.ok(!text.includes('live-secret-key-value'))
    assert.ok(!text.includes('wh_sec_value'))
    assert.equal(settings.body.data.hasXentripayApiKey, true)

    const me = await admin.get('/api/auth/me')
    assert.equal(me.body.data.passwordHash, undefined)
  })
})
