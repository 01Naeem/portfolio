// Usage: ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='Str0ngPassw0rd!' [ADMIN_NAME='Your Name'] npm run seed:admin
// Creates the single admin account (refuses if one exists) and the default Profile/Settings documents.
import mongoose from 'mongoose';
import '../config/env.js';
import { connectDB } from '../config/db.js';
import User from '../models/User.js';
import Profile from '../models/Profile.js';
import SiteSettings from '../models/SiteSettings.js';
import { passwordRule } from '../validators/auth.js';

const { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME = 'Admin' } = process.env;

async function main() {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD environment variables.');
  }
  const pw = passwordRule.safeParse(ADMIN_PASSWORD);
  if (!pw.success) throw new Error(`Weak password: ${pw.error.issues[0].message}`);

  await connectDB();
  if (await User.exists({ role: 'admin' })) {
    console.log('An admin already exists. Nothing created. (Use Change Password in the admin panel.)');
  } else {
    await User.create({ name: ADMIN_NAME, email: ADMIN_EMAIL, password: ADMIN_PASSWORD, role: 'admin' });
    console.log(`Admin created: ${ADMIN_EMAIL}`);
  }
  await Profile.getSingleton();
  await SiteSettings.getSingleton();
  console.log('Default profile and settings are in place.');
}

main()
  .catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.connection.close());
