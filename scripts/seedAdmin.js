/**
 * Seed initial admin user into MongoDB.
 * 
 * Recreates the admin from the original SQL dump:
 *   ('Gannadheesh Raj', '$2y$10$2fptMiX1WAvVcUtq2tn4a.4ERdkIkEyv2pkuVN/6lDoEV8/11Yz1.', 'admin')
 * 
 * The bcrypt hash from PHP ($2y$...) is compatible with bcryptjs —
 * we can store it directly and bcryptjs.compare() will work.
 * 
 * Usage: node scripts/seedAdmin.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const Admin = require('../models/Admin');

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const bcrypt = require('bcryptjs');
    const defaultPasswordHash = await bcrypt.hash('Admin@123', 10);

    // Update or insert master admin
    await Admin.findOneAndUpdate(
      { user: 'Gannadheesh Raj' },
      { user: 'Gannadheesh Raj', password: defaultPasswordHash, designation: 'admin' },
      { upsert: true, returnDocument: 'after' }
    );

    // Update or insert standard admin
    await Admin.findOneAndUpdate(
      { user: 'admin' },
      { user: 'admin', password: defaultPasswordHash, designation: 'admin' },
      { upsert: true, returnDocument: 'after' }
    );

    console.log('✅ Admins seeded successfully: "admin" & "Gannadheesh Raj" (password: Admin@123)');

    await mongoose.connection.close();
    console.log('Done.');
    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  }
}

seed();
