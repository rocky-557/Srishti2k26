const express = require('express');
const router = express.Router();
const { requireAuth, requireGenfeePaid } = require('../middleware/auth');
const {
  registerEvent,
  registerWorkshop,
  registerFlagship,
  registerPaper
} = require('../controllers/registrationController');

// POST /api/register/event — register for an event (requires genfee paid)
router.post('/event', requireGenfeePaid, registerEvent);

// POST /api/register/workshop — register for a workshop (requires login only, not genfee)
router.post('/workshop', requireAuth, registerWorkshop);

// POST /api/register/flagship — register for flagship event (requires genfee paid)
router.post('/flagship', requireGenfeePaid, registerFlagship);

// POST /api/register/paper — register for paper presentation (requires genfee paid)
router.post('/paper', requireGenfeePaid, registerPaper);

module.exports = router;
