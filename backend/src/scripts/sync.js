import { sequelize } from '../models/index.js'

async function run() {
  try {
    await sequelize.sync({ alter: true })
    console.log('Tables synced')
    process.exit(0)
  } catch (error) {
    console.error('Sync failed:', error.message)
    process.exit(1)
  }
}

run()
