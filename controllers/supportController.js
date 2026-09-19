const User = require('../models/User');
const Registration = require('../models/Registration');
const Payment = require('../models/Payment');
const { fetchEmsStatus } = require('../utils/ems');

/**
 * POST /api/support/lookup
 *
 * Public-facing support lookup — no auth required.
 * Accepts: Mobile (10-digit), SRiSHTi ID (e.g. SRiSHTi251024 or 1024), or Email.
 * Returns: profile info, fee status, registrations, EMS live verification.
 * NEVER exposes: password hash, session data, or internal tokens.
 */
async function supportLookup(req, res) {
  try {
    const { identifier, eventId = 187 } = req.body;

    if (!identifier || typeof identifier !== 'string' || !identifier.trim()) {
      return res.status(400).json({ status: 'error', message: 'Please provide a Mobile number, SRiSHTi ID, or Email.' });
    }

    const raw = identifier.trim();

    // --- Build DB query (same logic as buildUserLookupQuery) ---
    const lower = raw.toLowerCase();
    const conditions = [
      { email: lower },
      { mobile: raw }
    ];

    // Extract numeric ID from SRiSHTi ID patterns
    const srishtiMatch = raw.match(/^(?:srishti|sri|s)?(?:2[456])?(\d+)$/i);
    if (srishtiMatch && srishtiMatch[1]) {
      const num = parseInt(srishtiMatch[1], 10);
      if (!isNaN(num) && num > 0) conditions.push({ memberId: num });
    }
    const digitsOnly = raw.replace(/\D/g, '');
    if (digitsOnly && digitsOnly.length >= 1 && digitsOnly.length <= 8) {
      const num = parseInt(digitsOnly, 10);
      if (!isNaN(num) && num > 0) conditions.push({ memberId: num });
    }

    const query = { $or: conditions };

    // --- Fetch user (strip password) ---
    const user = await User.findOne(query).select('-password');

    // --- Fetch EMS live status ---
    let emsData = null;
    const phoneForEms = user ? user.mobile : (digitsOnly.length === 10 ? digitsOnly : null);
    if (phoneForEms) {
      let emsRes = await fetchEmsStatus(Number(eventId) || 187, phoneForEms);
      if (!emsRes || emsRes.StatusCode !== 1) {
        emsRes = await fetchEmsStatus(106, phoneForEms);
      }
      emsData = emsRes || null;
    }

    if (!user && (!emsData || emsData.StatusCode !== 1)) {
      return res.status(404).json({
        status: 'not_found',
        message: 'No attendee found matching this identifier. Please check your input or contact the help desk.',
        emsData
      });
    }

    // --- Registrations ---
    let registrations = { events: [], workshops: [], papers: [], flagship: [] };
    let payments = [];
    if (user) {
      const [events, workshops, papers, flagship, pays] = await Promise.all([
        Registration.find({ email: user.email, type: 'event' }).select('name createdAt -_id'),
        Registration.find({ email: user.email, type: 'workshop' }).select('name fees createdAt -_id'),
        Registration.find({ email: user.email, type: 'paper' }).select('name fees createdAt -_id'),
        Registration.find({ email: user.email, type: 'flagship' }).select('name createdAt -_id'),
        Payment.find({ memberId: user.memberId }).select('amount status createdAt -_id')
      ]);
      registrations = {
        events: events.map(e => e.name),
        workshops: workshops.map(w => ({ name: w.name, status: w.fees || 'pending' })),
        papers: papers.map(p => p.name),
        flagship: flagship.map(f => f.name)
      };
      payments = pays;
    }

    // --- Build safe user profile ---
    const profile = user ? {
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      college: user.collegeName,
      department: user.department,
      accommodation: user.accommodation || 'No',
      gender: user.gender || '',
      srishtiId: `SRiSHTi25${user.memberId}`,
      memberId: user.memberId,
      genfee: user.genfee || 'unpaid',
      emsRegId: user.emsRegId || '',
      emsTxnAmount: user.emsTxnAmount || 0,
      emsParticipantType: user.emsParticipantType || '',
      emsRegDate: user.emsRegDate || ''
    } : null;

    return res.json({
      status: 'success',
      profile,
      registrations,
      payments,
      emsData
    });

  } catch (err) {
    console.error('[Support Lookup Error]', err);
    return res.status(500).json({ status: 'error', message: 'Server error. Please try again.' });
  }
}

module.exports = { supportLookup };
