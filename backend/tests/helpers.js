import request from 'supertest'
import bcrypt from 'bcryptjs'
import app from '../src/app.js'
import { sequelize, User, Category, Product, ProductImage, OtpCode } from '../src/models/index.js'

export { app, request }

export async function resetDatabase() {
  await sequelize.query('SET FOREIGN_KEY_CHECKS = 0')
  await sequelize.sync({ force: true })
  await sequelize.query('SET FOREIGN_KEY_CHECKS = 1')
}

export async function closeDatabase() {
  await sequelize.close()
}

let counter = 0

export async function createUser(overrides = {}) {
  counter += 1
  return User.create({
    name: 'Test User',
    email: `user${counter}@example.com`,
    phone: '0788111222',
    password: 'password123',
    isVerified: true,
    ...overrides
  })
}

export function createAdmin(overrides = {}) {
  return createUser({ name: 'Admin', role: 'admin', ...overrides })
}

export async function signIn(user, password = 'password123') {
  const agent = request.agent(app)
  const response = await agent.post('/api/auth/login').send({ email: user.email, password })
  if (response.status !== 200) {
    throw new Error(`Login failed in test setup: ${response.status} ${JSON.stringify(response.body)}`)
  }
  return agent
}

export async function createProduct(overrides = {}) {
  const [category] = await Category.findOrCreate({
    where: { slug: 'activewear' },
    defaults: { name: 'Activewear', slug: 'activewear' }
  })

  counter += 1
  const product = await Product.create({
    name: `Product ${counter}`,
    slug: `product-${counter}`,
    description: 'Test product',
    price: 10000,
    stock: 5,
    isPublished: true,
    categoryId: category.id,
    ...overrides
  })

  await ProductImage.create({ productId: product.id, url: 'https://example.com/p.jpg', sortOrder: 0 })

  return product
}

// Emails are not sent in tests, so plant a known code instead of reading one.
export async function plantOtp(user, purpose, code) {
  await OtpCode.destroy({ where: { userId: user.id, purpose } })
  return OtpCode.create({
    userId: user.id,
    purpose,
    codeHash: await bcrypt.hash(code, 4),
    expiresAt: new Date(Date.now() + 10 * 60 * 1000)
  })
}
