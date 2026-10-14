import sequelize from '../db.js';
import { User } from '../models/index.js';

const email = process.argv[2]?.trim().toLowerCase();

const run = async () => {
  if (!email) {
    throw new Error('Usage: npm run make:admin -- someone@example.com');
  }

  await sequelize.authenticate();

  const [updated] = await User.update({ role: 'admin' }, { where: { email } });

  if (!updated) {
    throw new Error(`No user found with the email ${email}`);
  }

  console.log(`${email} is now an admin`);
};

run()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => sequelize.close());
