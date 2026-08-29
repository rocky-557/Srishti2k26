const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { getProfile, syncEmsDetails } = require('../controllers/userController');

// GET /api/user/profile — get logged-in user's profile data
router.get('/profile', requireAuth, getProfile);

// POST /api/user/sync-ems — sync payment & workshop status with EMS API
router.post('/sync-ems', requireAuth, syncEmsDetails);

module.exports = router;
