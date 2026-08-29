/**
 * Auth Controller — handles signup, login, logout.
 * 
 * Ports:
 *   modules/add_user.php → signup()
 *   pcheck.php           → login()
 *   logout.php           → logout()
 */
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { getNextSequence } = require('../models/Counter');

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
    createpassword = createpassword || password;
    confirmpassword = confirmpassword || confirmPassword || createpassword;
    phone = phone || mobile;
    depart = depart || department || 'General';
    cgname = cgname || college;
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

    // Check for existing email
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.send('Email already in system! Try to Login');
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
 * POST /api/auth/login
 * 
 * Mirrors pcheck.php exactly:
 * - bcrypt.compare for password verification
 * - Returns 'true', 'pass', or 'false' as plain text
 */
async function login(req, res) {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.send('false');
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

module.exports = { signup, login, logout };
