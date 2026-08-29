const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { initiatePayment, confirmPayment } = require('../controllers/paymentController');

// POST /api/payment/process — initiate payment (requires login)
router.post('/process', requireAuth, initiatePayment);

// GET /api/payment/confirm — payment gateway callback (no auth, gateway calls this)
// Note: This is also mounted at /payconfirm in server.js for backward compatibility
router.get('/confirm', confirmPayment);

module.exports = router;
