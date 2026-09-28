/**
 * Auth Controller — handles signup, login, logout.
 *
 * Passwordless by design:
 *   - signup  → collects identity details only (no password)
 *   - login   → SRiSHTi ID (memberId) + registered mobile number
 *   - OTP / password-reset flows were removed
 */
const nodemailer = require('nodemailer');
const User = require('../models/User');
const { getNextSequence } = require('../models/Counter');
const { syncOrProvisionFromEms } = require('../utils/ems');

/**
 * POST /api/auth/signup
 *
 * Validates identity details (name, email, 10-digit mobile, college).
 * Plain-text responses kept for frontend compatibility.
 */
async function signup(req, res) {
  try {
    let { 
      name, firstName, lastName, email, 
      phone, mobile, 
      depart, department, 
      cgname, college, 
      gcheck, gender, 
      accomodation, accommodation 
    } = req.body;

    // Normalize field names (password is no longer collected or required)
    name = name || ((firstName || '') + (lastName ? ' ' + lastName : '')).trim();
    phone = phone || mobile;
    depart = depart || department || 'General';
    cgname = (cgname === 'others' || college === 'others') ? (req.body.otherCollege || 'Other College') : (cgname || college);
    gcheck = gcheck || gender || '';
    accomodation = accomodation || accommodation || 'No';

    // --- Validation (same order as PHP) ---
    if (!name || !email || !phone || !cgname) {
      return res.send('Please fill all the mandatory fields.');
    }

    // Email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.send('Please enter a valid email.');
    }

    // Phone length
    if (!phone || phone.length !== 10) {
      return res.send('Mobile Number must be 10 digits.');
    }

    // College name length
    if (!cgname || cgname.length <= 4) {
      return res.send('Enter your college name (as per ID card).');
    }

    // --- Duplicate handling: never create a second or conflicting record ---
    // Mobile is the primary identifier (matches the login pair: S-ID + mobile).
    const existingByMobile = await User.findOne({ mobile: phone });
    if (existingByMobile) {
      // Same person re-attempting signup: hand back their S-ID instead of an error,
      // so the frontend can route them straight to a working login.
      return res.send('ALREADY_REGISTERED|SRiSHTi25' + existingByMobile.memberId);
    }

    // Email already taken by a different account (different mobile) — never overwrite.
    const existingByEmail = await User.findOne({ email: email.toLowerCase() });
    if (existingByEmail) {
      return res.send('EMAIL_TAKEN');
    }

    // Get next sequential ID (for payment gateway compatibility)
    const memberId = await getNextSequence('userId');

    // Create user document (merges old eusers + members inserts)
    let user;
    try {
      user = await User.create({
        name,
        email: email.toLowerCase(),
        mobile: phone,
        department: depart,
        collegeName: cgname,
        gender: gcheck || '',
        accommodation: accomodation || 'No',
        genfee: '',
        memberId
      });
    } catch (createErr) {
      // Duplicate-key (unique index on mobile/email) means a concurrent signup won the
      // race. Return that account's S-ID instead of failing or creating a duplicate.
      if (createErr && createErr.code === 11000) {
        const winner = await User.findOne({
          $or: [{ mobile: phone }, { email: email.toLowerCase() }]
        });
        if (winner) {
          return res.send('ALREADY_REGISTERED|SRiSHTi25' + winner.memberId);
        }
      }
      throw createErr;
    }

    // Asynchronously dispatch "Thank You for Registering" email (non-blocking)
    sendWelcomeEmail({ name, email: email.toLowerCase(), memberId, cgname, depart });

    // Set session (same keys as PHP)
    req.session.login = memberId;
    req.session.id_num = memberId;
    req.session.name = name;
    req.session.email = email.toLowerCase();
    req.session.mobile = phone;
    req.session.depart = depart;
    req.session.cgname = cgname;
    req.session.accomodation = accomodation || 'No';
    req.session.genfee = '';

    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.send('Error: please try again');
      }
      return res.send('Registered Successfully');
    });
  } catch (err) {
    console.error('Signup error:', err);
    return res.send('Error: please try again');
  }
}

/**
 * Helper to build flexible user query matching Email, Mobile, or SRiSHTi ID
 */
function buildUserLookupQuery(input) {
  if (!input || typeof input !== 'string') return null;
  const raw = input.trim();
  if (!raw) return null;

  const lower = raw.toLowerCase();
  const conditions = [
    { email: lower },
    { mobile: raw }
  ];

  // Extract numeric ID from SRiSHTi ID (e.g. SRiSHTi251024, SRISHTI261024, SR1024, or raw digits)
  const srishtiPrefixMatch = raw.match(/^(?:srishti|sri|s)?(?:2[456])?(\d+)$/i);
  if (srishtiPrefixMatch && srishtiPrefixMatch[1]) {
    const num = parseInt(srishtiPrefixMatch[1], 10);
    if (!isNaN(num) && num > 0) {
      conditions.push({ memberId: num });
    }
  }

  const digitsOnly = raw.replace(/\D/g, '');
  if (digitsOnly && digitsOnly.length >= 1 && digitsOnly.length <= 8) {
    const num = parseInt(digitsOnly, 10);
    if (!isNaN(num) && num > 0) {
      conditions.push({ memberId: num });
    }
  }

  return { $or: conditions };
}

/**
 * POST /api/auth/login
 *
 * Passwordless login. Two fields, both must match the same account:
 *   1. SRiSHTi ID  — SRiSHTi251024, SRiSHTi26xxx, SR1024, or bare 1024
 *      OR  Email   — the registered email address
 *   2. Mobile number — the registered 10-digit number
 *
 * - Tolerates prefixes/spacing in the S-ID and +91/0/spaces in the mobile
 * - Never fails on anything except a genuine identifier+mobile mismatch
 * - Returns 'true' or 'false' as plain text for frontend compatibility
 */
async function login(req, res) {
  try {
    const {
      srishtiId, srishtid, id_num, sId, memberId, email, username, identifier,
      phone, mobile, mobileNumber, mob
    } = req.body;

    const rawId = (srishtiId || srishtid || id_num || sId || memberId || email || username || identifier || '')
      .toString().trim();
    const rawPhone = (phone || mobile || mobileNumber || mob || '').toString().trim();

    if (!rawId || !rawPhone) {
      return res.send('false');
    }

    // --- Parse mobile: keep last 10 digits so +91/0/spaces all work ---
    const phoneDigits = rawPhone.replace(/\D/g, '');
    if (phoneDigits.length < 10) {
      return res.send('false');
    }
    const mobile10 = phoneDigits.slice(-10);

    // --- Decide whether the identifier is an email or an S-ID ---
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawId);

    let candidates = [];
    if (isEmail) {
      // Email path
      candidates = await User.find({ email: rawId.toLowerCase() }).limit(5);
    } else {
      // S-ID path -> numeric memberId
      let numericId = null;
      const prefixMatch = rawId.match(/^(?:srishti|sri|s)?\s*-?\s*(?:2[456])?\s*(\d+)$/i);
      if (prefixMatch && prefixMatch[1]) {
        const n = parseInt(prefixMatch[1], 10);
        if (!isNaN(n) && n > 0) numericId = n;
      }
      if (numericId === null) {
        const digitsOnly = rawId.replace(/\D/g, '');
        if (digitsOnly && digitsOnly.length <= 8) {
          const n = parseInt(digitsOnly, 10);
          if (!isNaN(n) && n > 0) numericId = n;
        }
      }
      if (numericId === null) {
        return res.send('false');
      }
      candidates = await User.find({ memberId: numericId }).limit(5);
    }

    // --- Both fields must match the same account ---
    let user = candidates.find(u => {
      const d = String(u.mobile || '').replace(/\D/g, '');
      return d.length >= 10 && d.slice(-10) === mobile10;
    });

    if (!user && candidates.length === 1 && !candidates[0].mobile) {
      // Legacy record with no mobile on file: trust the identifier alone rather than fail
      user = candidates[0];
    }

    if (!user) {
      // Last resort: EMS-provision the account (paid on EMS but never registered here).
      // Only accept it if the mobile genuinely matches what the user typed — a mismatch
      // means the identifier is wrong, so we refuse rather than log them into another account.
      try {
        const emsResult = await syncOrProvisionFromEms(mobile10);
        if (emsResult && emsResult.success && emsResult.user) {
          const provisioned = emsResult.user;
          const pMobile = String(provisioned.mobile || '').replace(/\D/g, '');
          const mobileMatches = pMobile.length >= 10 && pMobile.slice(-10) === mobile10;
          const idMatches = isEmail
            ? String(provisioned.email || '').toLowerCase() === rawId.toLowerCase()
            : Number(provisioned.memberId) === candidates[0]?.memberId;
          if (mobileMatches && (idMatches || provisioned.memberId == null)) {
            user = provisioned;
          }
        }
      } catch (e) {
        console.error('EMS provision during login failed:', e.message);
      }
    }

    if (!user) {
      return res.send('false');
    }

    // --- Populate session (same keys as PHP's pcheck.php) ---
    req.session.login = user.memberId;
    req.session.id_num = user.memberId;
    req.session.name = user.name;
    req.session.email = user.email;
    req.session.mobile = user.mobile;
    req.session.depart = user.department;
    req.session.cgname = user.collegeName;
    req.session.accomodation = user.accommodation;
    req.session.genfee = user.genfee;

    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.send('false');
      }
      return res.send('true');
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.send('false');
  }
}

function logout(req, res) {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
    }
    res.clearCookie('connect.sid', { path: '/' });
    if (req.method === 'POST' || req.xhr || req.headers.accept?.includes('application/json')) {
      return res.json({ success: true, message: 'Logged out' });
    }
    return res.redirect('/home.html');
  });
}

/**
 * Sends a styled HTML registration confirmation email asynchronously via SMTP.
 */
async function sendWelcomeEmail({ name, email, memberId, cgname, depart }) {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      family: 4,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    const srishtiId = `SRiSHTi25${memberId}`;

    await transporter.sendMail({
      from: `"SRiSHTi 2k26 Team" <${process.env.SMTP_USER}>`,
      to: email,
      subject: `⚡ Welcome to SRiSHTi 2k26 — Registration Confirmed! (${srishtiId})`,
      html: `
        <div style="background-color: #060911; font-family: 'Poppins', Helvetica, Arial, sans-serif; padding: 30px 15px; color: #e0e6ed;">
          <div style="max-width: 600px; margin: 0 auto; background: #0c121e; border: 1px solid rgba(94, 255, 122, 0.25); border-radius: 16px; padding: 30px; box-shadow: 0 10px 40px rgba(0,0,0,0.6);">
            
            <div style="text-align: center; margin-bottom: 25px;">
              <h1 style="color: #5EFF7A; margin: 0; font-size: 26px; text-transform: uppercase; letter-spacing: 2px; text-shadow: 0 0 15px rgba(94, 255, 122, 0.4);">
                SRiSHTi 2k26
              </h1>
              <p style="color: #8899a6; font-size: 13px; margin-top: 4px;">National Level Technical Symposium | PSG Tech</p>
            </div>

            <hr style="border: 0; border-top: 1px solid rgba(94, 255, 122, 0.15); margin: 20px 0;" />

            <h2 style="color: #ffffff; font-size: 20px; margin-bottom: 12px;">Greetings ${name},</h2>
            <p style="color: #b0bec5; font-size: 14px; line-height: 1.6;">
              Thank you for registering for <strong>SRiSHTi 2k26</strong>! Your account has been created successfully. Assemble your skills and prepare to conquer the ultimate technical stage.
            </p>

            <div style="background: rgba(94, 255, 122, 0.06); border: 1px dashed rgba(94, 255, 122, 0.4); border-radius: 12px; padding: 20px; margin: 25px 0; text-align: center;">
              <span style="color: #8899a6; font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px; display: block; margin-bottom: 6px;">Your Official SRiSHTi ID</span>
              <span style="color: #5EFF7A; font-size: 30px; font-weight: 700; letter-spacing: 3px; font-family: monospace;">${srishtiId}</span>
            </div>

            <table style="width: 100%; font-size: 14px; color: #b0bec5; border-collapse: collapse; margin-bottom: 25px;">
              <tr>
                <td style="padding: 8px 0; color: #78909c;">College:</td>
                <td style="padding: 8px 0; color: #ffffff; text-align: right; font-weight: 500;">${cgname || 'PSG Tech'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #78909c;">Department:</td>
                <td style="padding: 8px 0; color: #ffffff; text-align: right; font-weight: 500;">${depart || 'General'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #78909c;">Registered Email:</td>
                <td style="padding: 8px 0; color: #ffffff; text-align: right; font-weight: 500;">${email}</td>
              </tr>
            </table>

            <div style="text-align: center; margin-top: 30px;">
              <a href="http://localhost:8526/login.html" style="background: linear-gradient(135deg, #1B5E20, #2E7D32, #43A047); color: #ffffff; padding: 12px 30px; border-radius: 30px; text-decoration: none; font-weight: 600; font-size: 14px; display: inline-block; box-shadow: 0 0 20px rgba(94, 255, 122, 0.3);">
                Login to Dashboard
              </a>
            </div>

            <hr style="border: 0; border-top: 1px solid rgba(94, 255, 122, 0.15); margin: 30px 0 15px 0;" />

            <p style="color: #607d8b; font-size: 12px; text-align: center; margin: 0;">
              If you have any questions, reach out to us at <a href="mailto:queries.srishti2k24@gmail.com" style="color: #5EFF7A;">queries.srishti2k24@gmail.com</a>.
            </p>
          </div>
        </div>
      `
    });
    console.log(`✅ Welcome registration email sent to ${email} (ID: ${srishtiId})`);
  } catch (err) {
    console.error('❌ Failed to send welcome registration email:', err.message || err);
  }
}


/**
 * Passwordless auth surface.
 * OTP / password-reset flows were removed together with the password mechanism.
 */
module.exports = {
  signup,
  login,
  logout,
  sendWelcomeEmail,
  buildUserLookupQuery
};
