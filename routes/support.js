const express = require('express');
const router = express.Router();
const { supportLookup } = require('../controllers/supportController');

// POST /api/support/lookup — public lookup by Mobile / SRiSHTi ID / Email
router.post('/lookup', supportLookup);

module.exports = router;
