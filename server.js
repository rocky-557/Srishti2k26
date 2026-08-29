/**
 * SRiSHTi 2k26 — Node.js / Express / MongoDB Backend Server
 * 
 * Serves the static frontend and provides REST API endpoints under /api/*.
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
const { confirmPayment } = require('./controllers/paymentController');

const app = express();
const PORT = process.env.PORT || 8526;
const STATIC_DIR = process.env.STATIC_DIR || path.join(__dirname, 'frontend');

// ============ MIDDLEWARE ============

// Security headers
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// CORS
app.use(cors({
  origin: true,
  credentials: true
}));

// Logging & Body Parsers
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============ SESSION CONFIG ============

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
    maxAge: 24 * 60 * 60 * 1000,
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    path: '/'
  }
}));

// No-cache header for API endpoints
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

// Payment Gateway Callbacks
app.get(['/payconfirm.php', '/payconfirm'], confirmPayment);

// ============ STATIC FILES & FRONTEND ============

app.use(express.static(STATIC_DIR));

// Root route
app.get('/', (req, res) => {
  res.sendFile(path.join(STATIC_DIR, 'index.html'));
});

// Page URL Aliases
app.get(['/signup.html', '/signup.php', '/signup'], (req, res) => {
  res.sendFile(path.join(STATIC_DIR, 'register.html'));
});

app.get('/login.php', (req, res) => {
  if (req.session && req.session.email) {
    return res.redirect('/profile.html');
  }
  res.sendFile(path.join(STATIC_DIR, 'login.html'));
});

app.get('/profile.php', (req, res) => {
  if (!req.session || !req.session.email) {
    return res.redirect('/login.html');
  }
  res.sendFile(path.join(STATIC_DIR, 'profile.html'));
});

app.get('/home.php', (req, res) => {
  res.sendFile(path.join(STATIC_DIR, 'home.html'));
});

app.get(['/events.php', '/events.html'], (req, res) => {
  res.sendFile(path.join(STATIC_DIR, 'event.html'));
});

app.get('/workshop.php', (req, res) => {
  res.sendFile(path.join(STATIC_DIR, 'workshop.html'));
});

// Admin Panel Aliases
app.get(['/adminlogin/login.html', '/admin/login.html', '/admin/login', '/admin'], (req, res) => {
  res.sendFile(path.join(STATIC_DIR, 'admin', 'login.html'));
});

app.get(['/adminlogin/dashboard.html', '/admin/dashboard.html', '/admin/dashboard'], (req, res) => {
  if (!req.session || !req.session.admin_user) return res.redirect('/admin/login.html');
  res.sendFile(path.join(STATIC_DIR, 'admin', 'dashboard.html'));
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
    console.log(`\n🚀 SRiSHTi 2k26 server running on http://localhost:${PORT}`);
    console.log(`📁 Serving frontend from: ${STATIC_DIR}`);
    console.log(`📡 API available at: http://localhost:${PORT}/api/\n`);
  });
}

start();
