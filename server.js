/**
 * SRISHTI 2k25 — Node.js/Express/MongoDB Backend
 * 
 * Migrated from PHP/MySQL. Serves the existing static frontend
 * and provides API endpoints under /api/*.
 */
require('dotenv').config();

const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo').default;
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const connectDB = require('./config/db');

// Route imports
const authRoutes = require('./routes/auth');
const registrationRoutes = require('./routes/registration');
const paymentRoutes = require('./routes/payment');
const userRoutes = require('./routes/user');
const contactRoutes = require('./routes/contact');
const adminRoutes = require('./routes/admin');

// Payment confirm handler (mounted at root for gateway callback URL compatibility)
const { confirmPayment } = require('./controllers/paymentController');

const app = express();
const PORT = process.env.PORT || 8526;

// ============ MIDDLEWARE ============

// Security headers (relaxed CSP for inline styles/scripts in existing frontend)
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// CORS
app.use(cors({
  origin: true,
  credentials: true
}));

// Request logging
app.use(morgan('dev'));

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============ SESSION ============

app.use(session({
  secret: process.env.SESSION_SECRET || 'srishti_2k26_secret_key',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    collectionName: 'sessions',
    ttl: 24 * 60 * 60 // 24 hours
  }),
  cookie: {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    httpOnly: true,
    secure: false, // Set true in production with HTTPS
    sameSite: 'lax',
    path: '/'
  }
}));

// ============ NO-CACHE FOR API ROUTES ============
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

// ============ API ROUTES ============

app.use('/api/auth', authRoutes);
app.use('/api/register', registrationRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/user', userRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/admin', adminRoutes);

// Payment gateway callback URL (backward compatibility)
// The PSG gateway redirects to /payconfirm.php?data=...
// We catch both /payconfirm.php and /payconfirm
app.get('/payconfirm.php', confirmPayment);
app.get('/payconfirm', confirmPayment);

// ============ BACKWARD-COMPATIBLE PHP URL REDIRECTS ============
// These redirect old PHP AJAX URLs to new API endpoints
// so the frontend works even if some pages still have old URLs

// Legacy auth URLs
app.post('/pcheck.php', (req, res) => {
  const { login } = require('./controllers/authController');
  login(req, res);
});
app.get('/logout.php', (req, res) => {
  const { logout } = require('./controllers/authController');
  logout(req, res);
});

// Legacy registration URLs
app.post('/eregistered.php', (req, res) => {
  // Inline middleware check for genfee
  if (!req.session || !req.session.email) return res.send('false');
  if (!req.session.genfee || req.session.genfee !== 'paid') return res.send('genfee');
  const { registerEvent } = require('./controllers/registrationController');
  registerEvent(req, res);
});
app.post('/wregistered.php', (req, res) => {
  if (!req.session || !req.session.email) return res.send('false');
  const { registerWorkshop } = require('./controllers/registrationController');
  registerWorkshop(req, res);
});
app.post('/flagship.php', (req, res) => {
  if (!req.session || !req.session.email) return res.send('false');
  if (!req.session.genfee || req.session.genfee !== 'paid') return res.send('genfee');
  const { registerFlagship } = require('./controllers/registrationController');
  registerFlagship(req, res);
});
app.post('/flagregistered.php', (req, res) => {
  if (!req.session || !req.session.email) return res.send('false');
  if (!req.session.genfee || req.session.genfee !== 'paid') return res.send('genfee');
  const { registerFlagship } = require('./controllers/registrationController');
  registerFlagship(req, res);
});
app.post('/ppregistered.php', (req, res) => {
  if (!req.session || !req.session.email) return res.send('false');
  if (!req.session.genfee || req.session.genfee !== 'paid') return res.send('genfee');
  const { registerPaper } = require('./controllers/registrationController');
  registerPaper(req, res);
});

// Legacy module URLs
app.post('/modules/add_user.php', (req, res) => {
  const { signup } = require('./controllers/authController');
  signup(req, res);
});
app.post('/modules/payprocess.php', (req, res) => {
  if (!req.session || !req.session.email) return res.redirect('/login.html');
  const { initiatePayment } = require('./controllers/paymentController');
  initiatePayment(req, res);
});
app.post('/modules/sendmsg.php', (req, res) => {
  const { sendMessage } = require('./controllers/contactController');
  sendMessage(req, res);
});

// Legacy admin URLs
app.post('/adminlogin/login_process.php', (req, res) => {
  const { adminLogin } = require('./controllers/adminController');
  adminLogin(req, res);
});
app.post('/adminlogin/search_members.php', (req, res) => {
  if (!req.session || !req.session.admin_user) return res.status(401).send('Unauthorized');
  const { searchMembers } = require('./controllers/adminController');
  searchMembers(req, res);
});
app.post('/adminlogin/add_admin_process.php', (req, res) => {
  if (!req.session || !req.session.admin_user) return res.status(401).json({ status: 'error', message: 'Unauthorized' });
  const { addAdmin } = require('./controllers/adminController');
  addAdmin(req, res);
});
app.post('/adminlogin/remove_admin_process.php', (req, res) => {
  if (!req.session || req.session.admin_user !== 'Gannadheesh Raj') return res.status(401).json({ status: 'error', message: 'Unauthorized' });
  const { removeAdmin } = require('./controllers/adminController');
  removeAdmin(req, res);
});
app.post('/adminlogin/download_eventwise.php', (req, res) => {
  if (!req.session || !req.session.admin_user) return res.status(401).send('Unauthorized');
  const { downloadEventwise } = require('./controllers/adminController');
  downloadEventwise(req, res);
});
app.get('/adminlogin/logout.php', (req, res) => {
  const { adminLogout } = require('./controllers/adminController');
  adminLogout(req, res);
});

// ============ STATIC FILES ============
// Serve the UI frontend from frontend
const STATIC_DIR = process.env.STATIC_DIR || path.join(__dirname, 'frontend');
app.use(express.static(STATIC_DIR));
// Also serve any local public/ directory (for overrides)
app.use(express.static(path.join(__dirname, 'public')));

// Root route explicitly serves index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(STATIC_DIR, 'index.html'));
});

// ============ PHP & URL REDIRECTS ============
// Redirect .php / alternative URLs to .html equivalents in frontend

// signup / signup.html / signup.php -> serve register.html
app.get(['/signup.html', '/signup.php', '/signup'], (req, res) => {
  res.sendFile(path.join(STATIC_DIR, 'register.html'));
});

// login.php -> serve login.html
app.get('/login.php', (req, res) => {
  if (req.session && req.session.email) {
    return res.redirect('/profile.html');
  }
  res.sendFile(path.join(STATIC_DIR, 'login.html'));
});

// profile.php -> serve profile.html (if requested)
app.get('/profile.php', (req, res) => {
  if (!req.session || !req.session.email) {
    return res.redirect('/login.html');
  }
  res.sendFile(path.join(STATIC_DIR, 'profile.html'));
});

// home.php -> serve home.html
app.get('/home.php', (req, res) => {
  res.sendFile(path.join(STATIC_DIR, 'home.html'));
});

// events.php & events.html -> serve event.html
app.get(['/events.php', '/events.html'], (req, res) => {
  res.sendFile(path.join(STATIC_DIR, 'event.html'));
});

// workshop.php -> serve workshop.html
app.get('/workshop.php', (req, res) => {
  res.sendFile(path.join(STATIC_DIR, 'workshop.html'));
});

// user.php -> API endpoint for the nav bar user snippet
app.get('/user.php', (req, res) => {
  if (req.session && (req.session.email || req.session.login)) {
    const name = req.session.name || 'User';
    res.send(`<a class="nav-link active" aria-current="page" href="./profile.html"><span>${name}</span></a>`);
  } else {
    res.send('<a href="./login.html" class="nav-link"><span>Register</span></a>');
  }
});

// Admin panel PHP & HTML redirects (supports both /admin/ and /adminlogin/)
app.get(['/adminlogin/ad-login.php', '/adminlogin/ad-login.html', '/admin/ad-login.php', '/admin/ad-login.html', '/admin/login'], (req, res) => {
  res.sendFile(path.join(STATIC_DIR, 'admin', 'ad-login.html'));
});
app.get(['/adminlogin/admin.php', '/adminlogin/admin.html', '/admin/admin.php', '/admin/admin.html'], (req, res) => {
  if (!req.session || !req.session.admin_user) return res.redirect('/admin/ad-login.html');
  res.sendFile(path.join(STATIC_DIR, 'admin', 'admin.html'));
});
app.get(['/adminlogin/dashboard.php', '/adminlogin/dashboard.html', '/admin/dashboard.php', '/admin/dashboard.html'], (req, res) => {
  if (!req.session || !req.session.admin_user) return res.redirect('/admin/ad-login.html');
  res.sendFile(path.join(STATIC_DIR, 'admin', 'dashboard.html'));
});
app.get(['/adminlogin/event_stats.php', '/adminlogin/event_stats.html', '/admin/event_stats.php', '/admin/event_stats.html'], (req, res) => {
  if (!req.session || !req.session.admin_user) return res.redirect('/admin/ad-login.html');
  res.sendFile(path.join(STATIC_DIR, 'admin', 'event_stats.html'));
});
app.get(['/adminlogin/update_member.php', '/adminlogin/update_member.html', '/admin/update_member.php', '/admin/update_member.html'], (req, res) => {
  if (!req.session || !req.session.admin_user) return res.redirect('/admin/ad-login.html');
  res.sendFile(path.join(STATIC_DIR, 'admin', 'update_member.html'));
});

// ============ API STATUS CHECK ============
app.get('/api/status', (req, res) => {
  res.json({
    status: 'ok',
    session: req.session ? {
      loggedIn: !!req.session.email,
      user: req.session.name || null,
      isAdmin: !!req.session.admin_user
    } : null
  });
});

// ============ START SERVER ============
async function start() {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`\n🚀 SRISHTI 2k25 server running on http://localhost:${PORT}`);
    console.log(`📁 Serving frontend from: ${STATIC_DIR}`);
    console.log(`📡 API available at: http://localhost:${PORT}/api/\n`);
  });
}

start();
