/**
 * Auth Controller — handles signup, login, logout.
 * 
 * Ports:
 *   modules/add_user.php → signup()
 *   pcheck.php           → login()
 *   logout.php           → logout()
 */
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const User = require('../models/User');
const { getNextSequence } = require('../models/Counter');
const { syncOrProvisionFromEms } = require('../utils/ems');

/**
 * POST /api/auth/signup
 * 
 * Mirrors modules/add_user.php exactly:
 * - Same validation rules (password complexity, phone length, college name)
 * - Same bcrypt cost factor (12)
 * - Same plain-text response format for frontend compatibility
 */
async function signup(req, res) {
  try {
    let { 
      name, firstName, lastName, email, 
      createpassword, confirmpassword, password, confirmPassword, 
      phone, mobile, 
      depart, department, 
      cgname, college, 
      gcheck, gender, 
      accomodation, accommodation 
    } = req.body;

    // Normalize field names
    name = name || ((firstName || '') + (lastName ? ' ' + lastName : '')).trim();
    phone = phone || mobile;
    createpassword = createpassword || password || ('Srishti@' + (phone && phone.length >= 4 ? phone.slice(-4) : '2026') + '!');
    confirmpassword = confirmpassword || confirmPassword || createpassword;
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

    // Password match
    if (createpassword !== confirmpassword) {
      return res.send('Password Mismatch');
    }

    // College name length
    if (!cgname || cgname.length <= 4) {
      return res.send('Enter your college name (as per ID card).');
    }

    // Password complexity (same rules as PHP)
    if (!createpassword || createpassword.length <= 8) {
      return res.send('Password must be at least 8 characters.');
    }
    if (!/[0-9]/.test(createpassword)) {
      return res.send('Your Password Must Contain At Least 1 Number!');
    }
    if (!/[A-Z]/.test(createpassword)) {
      return res.send('Your Password Must Contain At Least 1 Capital Letter!');
    }
    if (!/[a-z]/.test(createpassword)) {
      return res.send('Your Password Must Contain At Least 1 Lowercase Letter!');
    }
    if (!/['^£$%&*()}{@#~?><>,|=_+¬-]/.test(createpassword)) {
      return res.send('Your Password Must Contain At Least 1 special character!');
    }

    // Check for existing user by mobile (primary identifier)
    const existingUser = await User.findOne({ mobile: phone });
    if (existingUser) {
      return res.send('Mobile number already in system! Try to Login');
    }

    // Hash password with bcrypt cost 12 (same as PHP PASSWORD_BCRYPT with cost 12)
    const hashedPassword = await bcrypt.hash(createpassword, 12);

    // Get next sequential ID (for payment gateway compatibility)
    const memberId = await getNextSequence('userId');

    // Create user document (merges old eusers + members inserts)
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      mobile: phone,
      department: depart,
      collegeName: cgname,
      gender: gcheck || '',
      accommodation: accomodation || 'No',
      genfee: '',
      memberId
    });

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
 * Supports login via:
 * 1. Email Address (case-insensitive, trimmed)
 * 2. SRiSHTi ID (e.g. SRiSHTi251024, SRISHTI1024, or 1024)
 * 3. Mobile Number (10 digits)
 * 
 * Returns 'true', 'pass', or 'false' as plain text for frontend compatibility
 */
async function login(req, res) {
  try {
    const { email, username, loginId, identifier, password } = req.body;
    const loginIdentifier = email || username || loginId || identifier;

    if (!loginIdentifier || !password) {
      return res.send('false');
    }

    const query = buildUserLookupQuery(loginIdentifier);
    if (!query) {
      return res.send('false');
    }

    // Find user by Email / Mobile / SRiSHTi ID
    let user = await User.findOne(query);
    if (!user) {
      // Check if user is registered & paid on EMS (auto-provision)
      const emsResult = await syncOrProvisionFromEms(loginIdentifier);
      if (emsResult && emsResult.success && emsResult.user) {
        user = emsResult.user;
      } else {
        return res.send('false');
      }
    }

    // Verify password (bcryptjs handles PHP's $2y$ prefix transparently)
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.send('pass');
    }

    // Populate session (same keys as PHP's pcheck.php)
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
 * POST /api/auth/send-otp
 * Generates and sends a 6-digit OTP to the user's email address.
 */
async function sendOtp(req, res) {
  try {
    const { emailOrPhone } = req.body;
    if (!emailOrPhone) {
      return res.json({ status: 'error', message: 'Please enter your registered email or phone number.' });
    }

    const query = buildUserLookupQuery(emailOrPhone);
    if (!query) {
      return res.json({ status: 'error', message: 'Please enter your registered email, SRiSHTi ID, or phone number.' });
    }

    let user = await User.findOne(query);

    if (!user) {
      // Check EMS fallback
      const emsResult = await syncOrProvisionFromEms(emailOrPhone);
      if (emsResult && emsResult.success && emsResult.user) {
        user = emsResult.user;
      } else {
        return res.json({ status: 'error', message: 'No registered account found with this email, SRiSHTi ID, or mobile number.' });
      }
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = Date.now() + 5 * 60 * 1000; // 5 minutes

    req.session.otpData = {
      email: user.email,
      otp,
      expires,
      verified: false
    };

const dns = require('dns');
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

    // Log OTP to server console for testing/development
    console.log(`\n==============================================`);
    console.log(`🔑 SRiSHTi 2k26 OTP for ${user.email}: [ ${otp} ]`);
    console.log(`==============================================\n`);

    // Asynchronously attempt email dispatch (non-blocking)
    try {
      const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: process.env.EMAIL_USER || 'atommailer1@gmail.com',
          pass: process.env.EMAIL_PASS || 'dksg gljy slwt lgtj'
        }
      });

      transporter.sendMail({
        from: `"SRiSHTi 2k26" <${process.env.EMAIL_USER || 'atommailer1@gmail.com'}>`,
        to: user.email,
        subject: '🔑 Your SRiSHTi 2k26 Password Reset Verification Code',
        html: `
          <div style="font-family: Arial, sans-serif; background: #050810; color: #ffffff; padding: 30px; border-radius: 12px; max-width: 500px; margin: 0 auto; border: 1px solid rgba(201, 162, 39, 0.3);">
            <h2 style="color: #f0c040; text-align: center;">SRiSHTi 2k26</h2>
            <h4 style="text-align: center; color: #e0e0e0;">Password Reset Verification Code</h4>
            <p style="color: #b0bec5; font-size: 14px;">Hello <strong>${user.name}</strong>,</p>
            <p style="color: #b0bec5; font-size: 14px;">You requested a password reset for your SRiSHTi 2k26 account. Use the 6-digit code below to complete your password reset:</p>
            <div style="background: rgba(201, 162, 39, 0.1); border: 2px dashed #f0c040; border-radius: 10px; padding: 18px; text-align: center; margin: 25px 0;">
              <span style="font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #5EFF7A; font-family: monospace;">${otp}</span>
            </div>
            <p style="color: #ff6b6b; font-size: 12px; text-align: center;">⚠️ This code is valid for 5 minutes. Do not share it with anyone.</p>
          </div>
        `
      }).then(() => {
        console.log(`✅ OTP email delivered to ${user.email}`);
      }).catch(mailErr => {
        console.warn(`⚠️ SMTP unreachable. OTP code logged to terminal: ${otp}`);
      });
    } catch (e) {
      console.warn(`⚠️ SMTP init error:`, e.message);
    }

    req.session.save((err) => {
      if (err) console.error('OTP session save error:', err);
      return res.json({ status: 'success', message: `Verification code sent to ${user.email}.` });
    });
  } catch (err) {
    console.error('Send OTP error:', err);
    return res.json({ status: 'error', message: 'Failed to send OTP code. Please try again.' });
  }
}

/**
 * POST /api/auth/verify-otp
 * Verifies the 6-digit OTP code entered by the user.
 */
async function verifyOtp(req, res) {
  try {
    const { otp } = req.body;
    const otpData = req.session.otpData;

    if (!otpData) {
      return res.json({ status: 'error', message: 'No active OTP session found. Please request a new code.' });
    }

    if (Date.now() > otpData.expires) {
      req.session.otpData = null;
      return res.json({ status: 'error', message: 'OTP code has expired. Please request a new code.' });
    }

    if (otpData.otp !== String(otp).trim()) {
      return res.json({ status: 'error', message: 'Incorrect 6-digit OTP code.' });
    }

    otpData.verified = true;
    req.session.save((err) => {
      if (err) console.error('Verify OTP session save error:', err);
      return res.json({ status: 'success', message: 'OTP verified successfully.' });
    });
  } catch (err) {
    console.error('Verify OTP error:', err);
    return res.json({ status: 'error', message: 'Failed to verify OTP code.' });
  }
}

/**
 * POST /api/auth/reset-password
 * Resets user password after successful OTP verification.
 */
async function resetPassword(req, res) {
  try {
    const { password, confirmPassword } = req.body;
    const otpData = req.session.otpData;

    if (!otpData || !otpData.verified) {
      return res.json({ status: 'error', message: 'Unauthorized. Please verify your OTP code first.' });
    }

    if (!password || password.length < 8) {
      return res.json({ status: 'error', message: 'Password must be at least 8 characters long.' });
    }

    if (confirmPassword && password !== confirmPassword) {
      return res.json({ status: 'error', message: 'Passwords do not match.' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    await User.updateOne({ email: otpData.email }, { password: hashedPassword });

    req.session.otpData = null;
    req.session.save((err) => {
      if (err) console.error('Reset password session save error:', err);
      return res.json({ status: 'success', message: 'Password reset successfully! You can now log in.' });
    });
  } catch (err) {
    console.error('Reset password error:', err);
    return res.json({ status: 'error', message: 'Failed to reset password.' });
  }
}

/**
 * POST /api/auth/quick-reset-password
 * Automated OTP-less 2-Field Identity Verification (Email/SRiSHTi ID + Registered Phone)
 */
async function quickResetPassword(req, res) {
  try {
    const { identifier, email, srishtiId, mobile, phone, newPassword, confirmPassword } = req.body;
    const userIdentifier = (identifier || email || srishtiId || '').trim();
    const userPhone = (mobile || phone || '').trim();

    if (!userIdentifier || !userPhone) {
      return res.json({ 
        status: 'error', 
        message: 'Please provide both your Email / SRiSHTi ID and your registered 10-digit mobile number.' 
      });
    }

    const query = buildUserLookupQuery(userIdentifier);
    if (!query) {
      return res.json({ status: 'error', message: 'Invalid identifier provided.' });
    }

    // Must match the identifier AND the registered mobile number
    let user = await User.findOne({
      $and: [
        query,
        { mobile: userPhone }
      ]
    });

    if (!user) {
      // Check EMS fallback
      const emsResult = await syncOrProvisionFromEms(userPhone);
      if (emsResult && emsResult.success && emsResult.user) {
        user = emsResult.user;
      } else {
        return res.json({ 
          status: 'error', 
          message: 'Verification failed. The Email/SRiSHTi ID and Phone Number do not match any registered account.' 
        });
      }
    }

    // Determine password to set
    let passwordToSet = (newPassword || '').trim();
    let isDefault = false;

    if (!passwordToSet) {
      const last4 = user.mobile && user.mobile.length >= 4 ? user.mobile.slice(-4) : '2026';
      passwordToSet = `Srishti@${last4}!`;
      isDefault = true;
    } else {
      if (passwordToSet.length < 8) {
        return res.json({ status: 'error', message: 'Password must be at least 8 characters long.' });
      }
      if (confirmPassword && passwordToSet !== confirmPassword.trim()) {
        return res.json({ status: 'error', message: 'Passwords do not match.' });
      }
    }

    const hashedPassword = await bcrypt.hash(passwordToSet, 12);
    await User.updateOne({ _id: user._id }, { password: hashedPassword });

    return res.json({ 
      status: 'success', 
      message: isDefault 
        ? `Password reset to default: ${passwordToSet}` 
        : 'Password updated successfully! You can now log in.',
      password: isDefault ? passwordToSet : undefined
    });
  } catch (err) {
    console.error('Quick reset password error:', err);
    return res.json({ status: 'error', message: 'Failed to reset password. Please try again.' });
  }
}

/**
 * POST /api/auth/verify-identity
 * Verifies Email/SRiSHTi ID + Mobile number before presenting new password form
 */
async function verifyIdentity(req, res) {
  try {
    const { identifier, mobile, phone } = req.body;
    const userIdentifier = (identifier || '').trim();
    const userPhone = (mobile || phone || '').trim();

    if (!userIdentifier || !userPhone) {
      return res.json({ status: 'error', message: 'Please enter your Email / SRiSHTi ID and Phone Number.' });
    }

    const query = buildUserLookupQuery(userIdentifier);
    if (!query) {
      return res.json({ status: 'error', message: 'Invalid identifier.' });
    }

    let user = await User.findOne({
      $and: [query, { mobile: userPhone }]
    });

    if (!user) {
      // Check EMS fallback
      const emsResult = await syncOrProvisionFromEms(userPhone);
      if (emsResult && emsResult.success && emsResult.user) {
        user = emsResult.user;
      } else {
        return res.json({ status: 'error', message: 'Account not found matching this Email/ID and Phone Number.' });
      }
    }

    const last4 = user.mobile && user.mobile.length >= 4 ? user.mobile.slice(-4) : '2026';
    const defaultSuggestion = `Srishti@${last4}!`;

    return res.json({
      status: 'success',
      name: user.name,
      email: user.email,
      srishtiId: `SRiSHTi25${user.memberId}`,
      defaultSuggestion
    });
  } catch (err) {
    console.error('Verify identity error:', err);
    return res.json({ status: 'error', message: 'Verification error.' });
  }
}

module.exports = { 
  signup, 
  login, 
  logout, 
  sendWelcomeEmail, 
  sendOtp, 
  verifyOtp, 
  resetPassword, 
  quickResetPassword,
  verifyIdentity,
  buildUserLookupQuery 
};
