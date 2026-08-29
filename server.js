/**
 * SRiSHTi 2k26 — Node.js / Express / MongoDB Backend Server
 * 
 * Serves the static HTML frontend and provides REST API endpoints under /api/*.
 */
require('dotenv').config();

const crypto = require('crypto');
if (!globalThis.crypto) {
  globalThis.crypto = crypto;
}

const dns = require('dns');
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

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

// Payment Gateway Callback
app.get('/payconfirm', confirmPayment);

// ============ PAGE ROUTE ALIASES ============

// Admin Panel Routes
app.get(['/admin/login.html', '/admin/ad-login.html', '/admin/login', '/admin'], (req, res) => {
  res.sendFile(path.join(STATIC_DIR, 'admin', 'ad-login.html'));
});

app.get(['/admin/dashboard.html', '/admin/dashboard', '/dashboard.html', '/dashboard'], (req, res) => {
  if (!req.session || !req.session.admin_user) return res.redirect('/admin/ad-login.html');
  res.sendFile(path.join(STATIC_DIR, 'admin', 'dashboard.html'));
});

// Clean Page Aliases
app.get(['/signup.html', '/signup'], (req, res) => {
  res.sendFile(path.join(STATIC_DIR, 'register.html'));
});

app.get(['/forgot-password.html', '/forgot-password'], (req, res) => {
  res.redirect('/home.html#contact');
});

app.get('/events.html', (req, res) => {
  res.sendFile(path.join(STATIC_DIR, 'event.html'));
});

// Root route
app.get('/', (req, res) => {
  res.sendFile(path.join(STATIC_DIR, 'index.html'));
});

// ============ STATIC FILES & FRONTEND ============

app.use(express.static(STATIC_DIR));

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
