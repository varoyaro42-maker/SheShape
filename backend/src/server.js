import app from './app.js'
import { connectDatabase } from './db.js'
import { seedAdminUser } from './utils/seedAdminUser.js'
import { initMonitoring } from './utils/monitoring.js'

const port = Number(process.env.PORT) || 5000

async function start() {
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
