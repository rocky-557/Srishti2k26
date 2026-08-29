/**
 * Authentication middleware.
 * Replaces the PHP session_start() + isset($_SESSION['email']) pattern.
 */

// Require a logged-in user (checks session.email)
function requireAuth(req, res, next) {
  if (!req.session || !req.session.email) {
    // For API calls, send text response matching PHP behavior
    return res.send('false');
  }
  next();
}

// Require a logged-in admin (checks session.admin_user)
function requireAdmin(req, res, next) {
  if (!req.session || !req.session.admin_user) {
    return res.status(401).json({ status: 'error', message: 'Unauthorized access.' });
  }
  next();
}

// Require master admins specifically (Sri Raghav & Niranjan)
function requireMasterAdmin(req, res, next) {
  const masterAdmins = ['Sri Raghav', 'Niranjan', 'admin'];
  if (!req.session || !masterAdmins.includes(req.session.admin_user)) {
    return res.status(401).json({ status: 'error', message: 'Unauthorized access.' });
  }
  next();
}

// Require genfee to be paid (many event registrations require this)
function requireGenfeePaid(req, res, next) {
  if (!req.session || !req.session.email) {
    return res.send('false');
  }
  if (!req.session.genfee || req.session.genfee !== 'paid') {
    return res.send('genfee');
  }
  next();
}

module.exports = {
  requireAuth,
  requireAdmin,
  requireMasterAdmin,
  requireGenfeePaid
};
