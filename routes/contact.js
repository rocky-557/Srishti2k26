const express = require('express');
const router = express.Router();
const { sendMessage } = require('../controllers/contactController');

// POST /api/contact — send contact form message
router.post('/', sendMessage);

module.exports = router;
