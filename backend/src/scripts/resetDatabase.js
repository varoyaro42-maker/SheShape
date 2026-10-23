import '../loadEnv.js'
import { sequelize } from '../models/index.js'

/**
 * Drops every table and recreates the schema from the models. Meant for a
 * first deployment over an old prototype database. Refuses to run unless
 * CONFIRM_RESET=yes is set, so it cannot be triggered by accident.
 */
async function run() {
  if (process.env.CONFIRM_RESET !== 'yes') {
    console.error('Refusing to drop the database: set CONFIRM_RESET=yes to confirm.')
    process.exit(1)
  }
  await sequelize.query('SET FOREIGN_KEY_CHECKS = 0')
  await sequelize.drop()
  await sequelize.query('SET FOREIGN_KEY_CHECKS = 1')
  await sequelize.sync()
  console.log('Database reset: all tables recreated empty.')
  process.exit(0)
}

run().catch((error) => {
  console.error('Reset failed:', error.message)
  process.exit(1)
})
