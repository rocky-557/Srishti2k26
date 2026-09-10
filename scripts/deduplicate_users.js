/**
 * Script to detect duplicate mobile numbers in the database,
 * reconcile them with EMS data, preserve existing passwords/registrations,
 * and merge them into a single clean account per mobile number.
 * 
 * Usage: node scripts/deduplicate_users.js [--dry-run]
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Registration = require('../models/Registration');
const Payment = require('../models/Payment');
const { fetchEmsStatus } = require('../utils/ems');
require('dotenv').config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/s25';

async function reconcileDuplicates(dryRun = false) {
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB:', MONGO_URI);

  if (dryRun) {
    console.log('⚠️ Running in DRY-RUN mode (no DB changes will be saved)\n');
  }

  // Find all duplicates by mobile (10 digits)
  const duplicates = await User.aggregate([
    { $match: { mobile: { $exists: true, $ne: null, $ne: '' } } },
    {
      $group: {
        _id: "$mobile",
        count: { $sum: 1 },
        docs: { $push: "$$ROOT" }
      }
    },
    { $match: { count: { $gt: 1 } } }
  ]);

  console.log(`Found ${duplicates.length} mobile numbers with duplicate accounts.\n`);

  let totalMerged = 0;
  let totalDeleted = 0;
  let totalRegistrationsMigrated = 0;

  for (const group of duplicates) {
    const mobile = group._id;
    const docs = group.docs;
    console.log(`📱 Processing Mobile: ${mobile} (${docs.length} duplicates)`);

    // 1. Sort docs to find best primary candidate:
    // - Paid genfee first
    // - Has valid password
    // - Oldest memberId / createdAt
    docs.sort((a, b) => {
      const aPaid = a.genfee === 'paid' ? 2 : 0;
      const bPaid = b.genfee === 'paid' ? 2 : 0;
      if (aPaid !== bPaid) return bPaid - aPaid;
      return (a.memberId || 999999) - (b.memberId || 999999);
    });

    const primaryDoc = docs[0];
    const otherDocs = docs.slice(1);
    const otherMemberIds = otherDocs.map(d => d.memberId).filter(Boolean);
    const otherDbIds = otherDocs.map(d => d._id);

    console.log(`   -> Designated Primary Account: SRiSHTi25${primaryDoc.memberId} (ID: ${primaryDoc._id})`);
    console.log(`   -> Redundant Accounts to Merge: ${otherMemberIds.map(id => 'SRiSHTi25' + id).join(', ')}`);

    // 2. Fetch authoritative data from EMS
    const ems187 = await fetchEmsStatus(187, mobile);
    const ems106 = (!ems187 || ems187.StatusCode !== 1) ? await fetchEmsStatus(106, mobile) : null;
    const ems = (ems187 && ems187.StatusCode === 1) ? ems187 : ems106;

    let updatedName = primaryDoc.name;
    let updatedEmail = primaryDoc.email;
    let updatedGenfee = primaryDoc.genfee;

    if (ems && ems.StatusCode === 1 && ems.Response) {
      const emsData = ems.Response;
      console.log(`   -> Found EMS Record: Name="${emsData.Name}", Email="${emsData.Email}", Paid=${emsData.Paid_status}`);
      if (emsData.Name && emsData.Name.trim()) updatedName = emsData.Name.trim();
      if (emsData.Email && emsData.Email.trim()) updatedEmail = emsData.Email.trim().toLowerCase();
      if (emsData.Paid_status === 1 || emsData.Paid_status === '1') updatedGenfee = 'paid';
    } else {
      console.log(`   -> No EMS record found for ${mobile}. Retaining DB values.`);
    }

    // 3. Ensure valid password exists
    let activePassword = primaryDoc.password;
    if (!activePassword || activePassword.length < 10) {
      const last4 = mobile.slice(-4);
      const defaultPw = `Srishti@${last4}!`;
      activePassword = await bcrypt.hash(defaultPw, 12);
      console.log(`   -> Reset password to default format Srishti@<last4>!`);
    }

    if (!dryRun) {
      // 4. Migrate registrations and payments
      if (otherMemberIds.length > 0) {
        const regUpdate = await Registration.updateMany(
          { memberId: { $in: otherMemberIds } },
          { $set: { memberId: primaryDoc.memberId, email: updatedEmail, mobile } }
        );
        const payUpdate = await Payment.updateMany(
          { memberId: { $in: otherMemberIds } },
          { $set: { memberId: primaryDoc.memberId, email: updatedEmail, mobile } }
        );
        totalRegistrationsMigrated += (regUpdate.modifiedCount || 0);
        console.log(`   -> Migrated ${regUpdate.modifiedCount || 0} registrations & ${payUpdate.modifiedCount || 0} payments.`);
      }

      // 5. Update primary user record
      await User.findByIdAndUpdate(primaryDoc._id, {
        $set: {
          name: updatedName,
          email: updatedEmail,
          mobile,
          genfee: updatedGenfee,
          password: activePassword
        }
      });

      // 6. Delete duplicate user records
      const delRes = await User.deleteMany({ _id: { $in: otherDbIds } });
      totalDeleted += (delRes.deletedCount || 0);
      console.log(`   -> Deleted ${delRes.deletedCount || 0} duplicate user docs.`);
    }

    totalMerged++;
    console.log('');
  }

  console.log('==========================================================');
  console.log(`✅ Completed Deduplication Summary:`);
  console.log(`   - Duplicate Mobile Groups Processed: ${totalMerged}`);
  console.log(`   - Redundant User Records Removed:    ${totalDeleted}`);
  console.log(`   - Registrations Re-linked:           ${totalRegistrationsMigrated}`);
  console.log('==========================================================\n');

  await mongoose.disconnect();
}

if (require.main === module) {
  const dryRun = process.argv.includes('--dry-run');
  reconcileDuplicates(dryRun).catch(err => {
    console.error('Deduplication script error:', err);
    process.exit(1);
  });
}

module.exports = { reconcileDuplicates };
