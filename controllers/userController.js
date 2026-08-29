const https = require('https');
const User = require('../models/User');
const Registration = require('../models/Registration');

// Workshop mapping from EMS Participant_Type_Name to Srishti workshop names
const EMS_WORKSHOP_MAP = {
  'workshop on from pixels to intelligence': 'From Pixels to Intelligence: Hands-on Computer Vision with YOLO',
  'workshop on powering future mobility': 'Powering Future Mobility: Hands-on EV Electronics Design with KiCad',
  'workshop on automotive ecu development': 'Automotive ECU Development: Hands-on Model-Based Design with Simulink',
  'workshop on transistors to tapeout': 'Power Electronics: From MATLAB Simulation to Hardware Implementation',
  'workshop on tinyml & edge ai on esp32': 'Industrial IoT & Industry 4.0 – Industrial Communication Protocols, Edge Gateways & Cloud Data Visualization',
  'workshop on connected vehicle networks': 'The Future of Automotive Safety: Advanced Driver Assistance Systems (ADAS)',
  'workshop on ros 2 jazzy & robotics': 'ROS 2 Jazzy: From Bot simulation to Autonomous Robotics with TurtleBot3',
  'workshop on building your own ai assistant': 'Building Your Own AI Assistant: From Concept to Implementation',
  'workshop on pixel perfect ui/ux design': 'UI/UX Design with Figma & AI: From Ideas to Interactive Prototypes',
  'workshop on ai-powered digital twins': 'AI-Powered Digital Twins: Modeling, Simulation & Intelligent Systems'
};

// General registration participant types
const GENERAL_REG_TYPES = [
  'student',
  'psg ct - student',
  'psgitech - student'
];

/**
 * GET /api/user/profile
 * 
 * Returns JSON with user details + all registrations.
 */
async function getProfile(req, res) {
  try {
    const email = req.session.email;
    if (!email) {
      return res.status(401).json({ error: 'Not logged in' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Fetch all registrations for this user
    const events = await Registration.find({ email, type: 'event' }).select('name -_id');
    const workshops = await Registration.find({ email, type: 'workshop' }).select('name fees -_id');
    const papers = await Registration.find({ email, type: 'paper' }).select('name -_id');
    const flagship = await Registration.find({ email, type: 'flagship' }).select('name -_id');

    const memberId = user.memberId || req.session.login;
    const srishtiId = memberId ? `SRiSHTi25${memberId}` : 'N/A';

    return res.json({
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      department: user.department,
      college: user.collegeName,
      accommodation: user.accommodation,
      genfee: user.genfee || 'unpaid',
      emsRegId: user.emsRegId || '',
      emsTxnAmount: user.emsTxnAmount || 0,
      srishtiId,
      events: events.map(e => e.name),
      workshops: workshops.map(w => ({ name: w.name, status: w.fees })),
      papers: papers.map(p => p.name),
      flagship: flagship.map(f => f.name)
    });
  } catch (err) {
    console.error('Profile error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

/**
 * Helper to fetch EMS registration status from PSG API
 */
function fetchEmsStatus(eventId, phone) {
  return new Promise((resolve) => {
    const url = `https://events.psginstitutions.in/EMSAPI/api/Event/RegistrationStatus?eventId=${eventId}&phone=${encodeURIComponent(phone)}`;
    
    const req = https.get(url, { timeout: 8000 }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json);
        } catch (e) {
          resolve(null);
        }
      });
    });

    req.on('error', () => resolve(null));
    req.on('timeout', () => {
      req.destroy();
      resolve(null);
    });
  });
}

/**
 * POST /api/user/sync-ems
 * 
 * Verifies and synchronizes payments and workshop registrations directly from EMS.
 */
async function syncEmsDetails(req, res) {
  try {
    const email = req.session.email;
    if (!email) {
      return res.status(401).json({ success: false, message: 'Please log in first.' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User record not found.' });
    }

    const phone = user.mobile;
    if (!phone) {
      return res.status(400).json({ success: false, message: 'No mobile number associated with your account.' });
    }

    // 1. Query EMS for Srishti 2k26 (Event ID 187), with test fallback (Event ID 106)
    let emsResponse = await fetchEmsStatus(187, phone);
    if (!emsResponse || emsResponse.StatusCode !== 1) {
      emsResponse = await fetchEmsStatus(106, phone);
    }

    if (!emsResponse || emsResponse.StatusCode !== 1 || !Array.isArray(emsResponse.Data) || emsResponse.Data.length === 0) {
      return res.json({
        success: false,
        message: 'No completed payments found on EMS for your registered mobile number (' + phone + '). If you just paid, please allow 1-2 minutes and try again.',
        user: {
          genfee: user.genfee || 'unpaid',
          email: user.email,
          mobile: user.mobile
        }
      });
    }

    let syncedGeneral = false;
    let syncedWorkshops = [];
    let syncedRound2 = [];

    // 2. Process each confirmed registration item
    for (const item of emsResponse.Data) {
      if (item.Paid_status === '1' || item.Paid_status === 1) {
        const rawType = (item.Participant_Type_Name || '').trim().toLowerCase();

        // Check if General Registration
        if (GENERAL_REG_TYPES.includes(rawType)) {
          user.genfee = 'paid';
          user.emsRegId = String(item.Reg_Id || '');
          user.emsTxnAmount = Number(item.TxnAmount || 0);
          user.emsParticipantType = item.Participant_Type_Name || 'Student';
          user.emsRegDate = item.Reg_date || '';
          req.session.genfee = 'paid';
          syncedGeneral = true;
        }

        // Check if Workshop
        for (const [key, wsCanonicalName] of Object.entries(EMS_WORKSHOP_MAP)) {
          if (rawType.includes(key) || key.includes(rawType)) {
            await Registration.findOneAndUpdate(
              { email: user.email, type: 'workshop', name: wsCanonicalName },
              { email: user.email, type: 'workshop', name: wsCanonicalName, fees: 'paid' },
              { upsert: true, new: true }
            );
            if (!syncedWorkshops.includes(wsCanonicalName)) {
              syncedWorkshops.push(wsCanonicalName);
            }
          }
        }

        // Check if Round 2 Paper Presentation / Project Expo
        if (rawType.includes('paper presentation') || rawType.includes('project expo')) {
          syncedRound2.push(item.Participant_Type_Name);
        }
      }
    }

    await user.save();

    let statusMsg = 'EMS details synchronized successfully!';
    if (syncedGeneral && syncedWorkshops.length > 0) {
      statusMsg = `Confirmed General Registration & ${syncedWorkshops.length} Workshop(s)!`;
    } else if (syncedGeneral) {
      statusMsg = 'Confirmed General Registration (All events unlocked)!';
    } else if (syncedWorkshops.length > 0) {
      statusMsg = `Confirmed ${syncedWorkshops.length} Workshop registration(s)!`;
    }

    return res.json({
      success: true,
      message: statusMsg,
      syncedGeneral,
      syncedWorkshops,
      syncedRound2,
      user: {
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        genfee: user.genfee,
        emsRegId: user.emsRegId,
        emsTxnAmount: user.emsTxnAmount
      }
    });

  } catch (err) {
    console.error('EMS Sync Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to synchronize with EMS. Please try again.' });
  }
}

module.exports = { getProfile, syncEmsDetails };
