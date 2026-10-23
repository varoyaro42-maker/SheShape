import { User } from '../models/index.js';

export async function seedAdminUser() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) return null;

  const name = process.env.ADMIN_NAME?.trim() || 'Admin';
  const phone = process.env.ADMIN_PHONE?.trim() || '0788000000';

  const existing = await User.findOne({ where: { email } });

  if (existing) {
    existing.role = 'admin';
    existing.isVerified = true;
    if (!existing.name) existing.name = name;
    await existing.save();
    return existing;
  }

  return User.create({ name, email, phone, password, role: 'admin', isVerified: true });
}
