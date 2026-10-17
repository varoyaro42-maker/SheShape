import './loadEnv.js'
import app from './app.js'
import { connectDatabase } from './db.js'
import { seedAdminUser } from './utils/seedAdminUser.js'
import { initMonitoring } from './utils/monitoring.js'

const port = Number(process.env.PORT) || 5000

function checkConfig() {
  const problems = []
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) problems.push('JWT_SECRET must be at least 32 characters')
  const key = Buffer.from(process.env.ENCRYPTION_KEY || '', 'base64')
  if (key.length !== 32) problems.push('ENCRYPTION_KEY must be 32 random bytes, base64-encoded')
  if (!process.env.DATABASE_URL) problems.push('DATABASE_URL is missing')
  if (process.env.NODE_ENV === 'production' && !/^https:\/\//.test(process.env.CLIENT_URL || '')) problems.push('CLIENT_URL must be the https site address')
  if (process.env.ADMIN_PASSWORD && process.env.ADMIN_PASSWORD.length < 12) problems.push('ADMIN_PASSWORD must be at least 12 characters')
  return problems
}

async function start() {
  const problems = checkConfig()
  if (problems.length) {
    const message = `Configuration problems:\n - ${problems.join('\n - ')}`
    if (process.env.NODE_ENV === 'production') {
      console.error(message)
      process.exit(1)
    }
    console.warn(message)
  }

  try {
    if (await initMonitoring()) console.log('Error monitoring enabled')

    await connectDatabase()
    console.log('Database connected')

    const admin = await seedAdminUser()
    if (admin) console.log(`Admin account ready: ${admin.email}`)

    app.listen(port, () => {
      console.log(`API running on http://localhost:${port}`)
    })
  } catch (error) {
    console.error('Startup failed:', error.message)
    process.exit(1)
  }
}

start()
