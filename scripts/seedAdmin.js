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

    // Master admins: Sri Raghav & Niranjan
    await Admin.findOneAndUpdate(
      { user: 'Sri Raghav' },
      { user: 'Sri Raghav', password: defaultPasswordHash, designation: 'admin' },
      { upsert: true, returnDocument: 'after' }
    );

    await Admin.findOneAndUpdate(
      { user: 'Niranjan' },
      { user: 'Niranjan', password: defaultPasswordHash, designation: 'admin' },
      { upsert: true, returnDocument: 'after' }
    );

    // Standard admin
    await Admin.findOneAndUpdate(
      { user: 'admin' },
      { user: 'admin', password: defaultPasswordHash, designation: 'admin' },
      { upsert: true, returnDocument: 'after' }
    );

    // Delete legacy admin if exists
    await Admin.deleteOne({ user: 'Gannadheesh Raj' });

    console.log('✅ Admins seeded successfully: "Sri Raghav", "Niranjan", & "admin" (password: Admin@123)');

    await mongoose.connection.close();
    console.log('Done.');
    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  }
}

seed();
