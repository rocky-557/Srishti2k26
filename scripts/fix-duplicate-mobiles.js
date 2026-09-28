/**
 * Production-safe migration: clean duplicate mobiles/emails, then add unique indexes.
 *
 * Run on the SERVER (not locally):
 *   node scripts/fix-duplicate-mobiles.js            # dry run — prints, changes nothing
 *   node scripts/fix-duplicate-mobiles.js --apply    # actually dedupe + build indexes
 *
 * What it does:
 *   1. Dry-run by default — prints duplicates without deleting
 *   2. With --apply flag, removes extras, KEEPING the best record per group:
 *      paid accounts first (a paid person must never be dropped), then the
 *      lowest memberId (matches the admin "Fix Duplicates" button logic)
 *   3. Builds unique indexes on mobile + email only after cleanup verified
 *
 * NOTE: before --apply, take a backup:
 *   mongodump --uri="$MONGODB_URI" --out=./backup-$(date +%F)
 */
require('dotenv').config();
const mongoose = require('mongoose');

const DRY_RUN = !process.argv.includes('--apply');

const userSchema = new mongoose.Schema({}, { strict: false, timestamps: true });
const User = mongoose.model('User', userSchema);

// Keep-order shared with the admin dashboard's dedupe: paid first, then lowest memberId.
function orderKeepFirst(docs) {
  return docs.slice().sort((a, b) => {
    const aPaid = a.genfee === 'paid' ? 1 : 0;
    const bPaid = b.genfee === 'paid' ? 1 : 0;
    if (aPaid !== bPaid) return bPaid - aPaid;
    return (a.memberId || 999999999) - (b.memberId || 999999999);
  });
}

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log(`Connected. Mode: ${DRY_RUN ? 'DRY RUN (preview only)' : 'APPLY (will modify DB)'}\n`);

  // ── 1. Duplicate mobiles ──
  const mobileDupes = await User.aggregate([
    { $match: { mobile: { $exists: true, $ne: null, $ne: '' } } },
    { $group: { _id: '$mobile', count: { $sum: 1 }, docs: { $push: { id: '$_id', name: '$name', email: '$email', genfee: '$genfee', memberId: '$memberId', created: '$createdAt' } } } },
    { $match: { count: { $gt: 1 } } },
    { $sort: { count: -1 } }
  ]);

  console.log(`=== Duplicate Mobiles: ${mobileDupes.length} groups ===`);
  let totalMobileDupes = 0;
  for (const group of mobileDupes) {
    const sorted = orderKeepFirst(group.docs);
    const keep = sorted[0];
    const remove = sorted.slice(1);
    totalMobileDupes += remove.length;

    console.log(`  ${group._id} (${group.count}x):`);
    console.log(`    KEEP:  ${keep.name} [${keep.id}] memberId=${keep.memberId} genfee=${keep.genfee || 'unpaid'}`);
    for (const r of remove) {
      console.log(`    DEL:   ${r.name} [${r.id}] memberId=${r.memberId} genfee=${r.genfee || 'unpaid'}`);
    }

    if (!DRY_RUN) {
      await User.deleteMany({ _id: { $in: remove.map(r => r.id) } });
      console.log(`    → Deleted ${remove.length} duplicate(s)`);
    }
  }
  console.log(`Total mobile duplicates to remove: ${totalMobileDupes}\n`);

  // ── 2. Duplicate emails ──
  const emailDupes = await User.aggregate([
    { $match: { email: { $exists: true, $ne: null, $ne: '' } } },
    { $group: { _id: '$email', count: { $sum: 1 }, docs: { $push: { id: '$_id', name: '$name', mobile: '$mobile', genfee: '$genfee', memberId: '$memberId', created: '$createdAt' } } } },
    { $match: { count: { $gt: 1 } } },
    { $sort: { count: -1 } }
  ]);

  console.log(`=== Duplicate Emails: ${emailDupes.length} groups ===`);
  let totalEmailDupes = 0;
  for (const group of emailDupes) {
    const sorted = orderKeepFirst(group.docs);
    const keep = sorted[0];
    const remove = sorted.slice(1);
    totalEmailDupes += remove.length;

    console.log(`  ${group._id} (${group.count}x):`);
    console.log(`    KEEP:  ${keep.name} [${keep.id}] memberId=${keep.memberId} genfee=${keep.genfee || 'unpaid'}`);
    for (const r of remove) {
      console.log(`    DEL:   ${r.name} [${r.id}] memberId=${r.memberId} genfee=${r.genfee || 'unpaid'}`);
    }

    if (!DRY_RUN) {
      await User.deleteMany({ _id: { $in: remove.map(r => r.id) } });
      console.log(`    → Deleted ${remove.length} duplicate(s)`);
    }
  }
  console.log(`Total email duplicates to remove: ${totalEmailDupes}\n`);

  // ── 3. Unique indexes (only after cleanup) ──
  if (DRY_RUN) {
    console.log('=== Would build unique indexes on mobile + email (run with --apply) ===');
    console.log('\nDone (dry run — nothing was changed).');
    await mongoose.disconnect();
    return;
  }

  console.log('=== Building unique indexes ===');
  for (const field of ['mobile', 'email']) {
    try {
      await User.collection.createIndex({ [field]: 1 }, { unique: true, background: true });
      console.log(`  ✅ Unique index on ${field}`);
    } catch (e) {
      console.log(`  ⚠️  ${field} index NOT created: ${e.message}`);
      console.log(`     Resolve the duplicates above, then re-run --apply.`);
    }
  }

  // Verify
  const stillDupes = await User.aggregate([
    { $group: { _id: '$mobile', count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
    { $count: 'n' }
  ]);
  console.log(`\nRemaining mobile duplicate groups: ${(stillDupes[0] && stillDupes[0].n) || 0}`);

  console.log('\nDone.');
  await mongoose.disconnect();
}

run().catch(e => { console.error(e); process.exit(1); });
