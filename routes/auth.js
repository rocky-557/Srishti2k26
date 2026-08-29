const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Registration = require('../models/Registration');
const { signup, login, logout } = require('../controllers/authController');

// POST /api/auth/signup — user registration
router.post('/signup', signup);

// POST /api/auth/login — user login
router.post('/login', login);

// GET /api/auth/logout & POST /api/auth/logout — user logout
router.get('/logout', logout);
router.post('/logout', logout);

// GET /api/auth/session — get active user session
router.get('/session', async (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');

  try {
    if (req.session && (req.session.email || req.session.login || req.session.id_num)) {
      const email = req.session.email;
      const memberId = req.session.login || req.session.id_num;
      let user = null;
      if (email) {
        user = await User.findOne({ email: email.toLowerCase() });
      } else if (memberId) {
        user = await User.findOne({ memberId });
      }

      if (user) {
        // Keep session properties fresh
        req.session.login = user.memberId;
        req.session.id_num = user.memberId;
        req.session.name = user.name;
        req.session.email = user.email;
        req.session.mobile = user.mobile;
        req.session.depart = user.department;
        req.session.cgname = user.collegeName;
        req.session.accomodation = user.accommodation;
        req.session.genfee = user.genfee;

        // Fetch user registrations
        const registrations = await Registration.find({ email: user.email });
        const paidWorkshops = registrations
          .filter(r => r.type === 'workshop' && (r.fees === 'paid' || r.fees === 'Paid'))
          .map(r => r.name);
        const allWorkshops = registrations
          .filter(r => r.type === 'workshop')
          .map(r => ({ name: r.name, status: r.fees || 'unpaid' }));
        const events = registrations.filter(r => r.type === 'event').map(r => r.name);
        const papers = registrations.filter(r => r.type === 'paper').map(r => r.name);
        const flagship = registrations.filter(r => r.type === 'flagship').map(r => r.name);

        return res.json({
          loggedIn: true,
          user: {
            id: user.memberId,
            name: user.name,
            email: user.email,
            mobile: user.mobile,
            department: user.department,
            college: user.collegeName,
            genfee: user.genfee,
            srishtiId: user.memberId ? `SRiSHTi25${user.memberId}` : null,
            paidWorkshops,
            workshops: allWorkshops,
            events,
            papers,
            flagship
          }
        });
      }
    }
    return res.json({ loggedIn: false, user: null });
  } catch (err) {
    console.error('Session retrieval error:', err);
    return res.json({ loggedIn: false, user: null });
  }
});

module.exports = router;
