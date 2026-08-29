/**
 * Registration Controller — handles event, workshop, flagship, paper registration.
 * 
 * Ports:
 *   eregistered.php    → registerEvent()
 *   wregistered.php    → registerWorkshop()
 *   flagship.php       → registerFlagship()
 *   ppregistered.php   → registerPaper()
 */
const Registration = require('../models/Registration');

/**
 * POST /api/register/event
 * 
 * Mirrors eregistered.php:
 * - Requires session + genfee=='paid' (handled by middleware)
 * - Checks for duplicate registration
 * - Returns: 'true', 'rem', 'genfee', 'false'
 */
async function registerEvent(req, res) {
  try {
    const email = req.session.email;
    const evname = req.body.evname || req.body.name || req.body.eventName;

    if (!evname) {
      return res.send('false');
    }

    // Check if already registered
    const existing = await Registration.findOne({
      email,
      type: 'event',
      name: evname
    });

    if (existing) {
      return res.send('rem');
    }

    // Register for event
    await Registration.create({
      email,
      type: 'event',
      name: evname
    });

    return res.send('true');
  } catch (err) {
    console.error('Event registration error:', err);
    return res.send('false');
  }
}

/**
 * POST /api/register/workshop
 * 
 * Mirrors wregistered.php:
 * - Does NOT require genfee paid (workshops have separate fee)
 * - Checks if already registered AND paid
 * - Checks capacity (>69 paid = full)
 * - Returns: 'true', 'rem', 'full', 'false'
 */
async function registerWorkshop(req, res) {
  try {
    const email = req.session.email;
    const wsname = req.body.wsname || req.body.name || req.body.workshopName;

    if (!email) {
      return res.send('false');
    }
    if (!wsname) {
      return res.send('false');
    }

    // Check if already registered AND paid
    const alreadyPaid = await Registration.findOne({
      email,
      type: 'workshop',
      name: wsname,
      fees: 'paid'
    });

    if (alreadyPaid) {
      return res.send('rem');
    }

    // Check capacity (>69 paid registrations = full)
    const paidCount = await Registration.countDocuments({
      type: 'workshop',
      name: wsname,
      fees: 'paid'
    });

    if (paidCount > 69) {
      return res.send('full');
    }

    // Check if already registered (but not paid)
    const existing = await Registration.findOne({
      email,
      type: 'workshop',
      name: wsname
    });

    if (!existing) {
      await Registration.create({
        email,
        type: 'workshop',
        name: wsname,
        fees: ''
      });
    }

    return res.send('true');
  } catch (err) {
    console.error('Workshop registration error:', err);
    return res.send('false');
  }
}

/**
 * POST /api/register/flagship
 * 
 * Mirrors flagship.php / flagregistered.php:
 * - Requires session + genfee=='paid' (handled by middleware)
 * - Checks for duplicate
 * - Returns: 'true', 'rem', 'genfee', 'false'
 */
async function registerFlagship(req, res) {
  try {
    const email = req.session.email;
    const fsname = req.body.fsname || req.body.flname || req.body.name || req.body.flagshipName;

    if (!fsname) {
      return res.send('false');
    }

    // Check if already registered
    const existing = await Registration.findOne({
      email,
      type: 'flagship',
      name: fsname
    });

    if (existing) {
      return res.send('rem');
    }

    // Register
    await Registration.create({
      email,
      type: 'flagship',
      name: fsname
    });

    return res.send('true');
  } catch (err) {
    console.error('Flagship registration error:', err);
    return res.send('false');
  }
}

/**
 * POST /api/register/paper
 * 
 * Mirrors ppregistered.php:
 * - Requires session + genfee=='paid' (handled by middleware)
 * - Checks for duplicate
 * - Returns: 'true', 'rem', 'genfee', 'false'
 */
async function registerPaper(req, res) {
  try {
    const email = req.session.email;
    const ppname = req.body.ppname || req.body.name || req.body.paperName;

    if (!ppname) {
      return res.send('false');
    }

    // Check if already registered
    const existing = await Registration.findOne({
      email,
      type: 'paper',
      name: ppname
    });

    if (existing) {
      return res.send('rem');
    }

    // Register
    await Registration.create({
      email,
      type: 'paper',
      name: ppname
    });

    return res.send('true');
  } catch (err) {
    console.error('Paper registration error:', err);
    return res.send('false');
  }
}

module.exports = {
  registerEvent,
  registerWorkshop,
  registerFlagship,
  registerPaper
};
