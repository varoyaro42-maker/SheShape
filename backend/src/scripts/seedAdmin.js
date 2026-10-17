import '../loadEnv.js'
import sequelize from '../db.js';
import { seedAdminUser } from '../utils/seedAdminUser.js';

async function run() {
  await sequelize.authenticate();

  const admin = await seedAdminUser();

  if (!admin) {
    throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD in .env before running this script.');
  }

  console.log(`Admin account ready: ${admin.email}`);
}

run()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => sequelize.close());
