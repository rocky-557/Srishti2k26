const https = require('https');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Registration = require('../models/Registration');
const { getNextSequence } = require('../models/Counter');

// Workshop mapping from EMS Participant_Type_Name to Srishti canonical names
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

const GENERAL_REG_TYPES = [
  'student',
  'psg ct - student',
  'psgitech - student'
];

/**
 * Queries PSG EMS API for a given phone number
 */
function fetchEmsStatus(eventId = 187, phone) {
  return new Promise((resolve) => {
    if (!phone) return resolve(null);
    const cleanPhone = String(phone).replace(/\D/g, '').slice(-10);
    if (!cleanPhone || cleanPhone.length !== 10) return resolve(null);

    const url = `https://events.psginstitutions.in/EMSAPI/api/Event/RegistrationStatus?eventId=${eventId}&phone=${encodeURIComponent(cleanPhone)}`;
    
    const req = https.get(url, { 
      timeout: 8000,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) SRiSHTi/2026' }
    }, (res) => {
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
 * Queries EMS and auto-creates or updates MongoDB user if registered on EMS
 */
async function syncOrProvisionFromEms(phoneOrEmail) {
  try {
    if (!phoneOrEmail) return { success: false, message: 'No phone or email provided' };

    let phone = '';
    const digits = String(phoneOrEmail).replace(/\D/g, '');
    if (digits.length >= 10) {
      phone = digits.slice(-10);
    }

    // 1. Fetch EMS Status for Event 187
    let emsRes = await fetchEmsStatus(187, phone || phoneOrEmail);
    if (!emsRes || emsRes.StatusCode !== 1) {
      emsRes = await fetchEmsStatus(106, phone || phoneOrEmail);
    }

    if (!emsRes || emsRes.StatusCode !== 1 || !Array.isArray(emsRes.Data) || emsRes.Data.length === 0) {
      return { success: false, message: 'No completed registration found on EMS.' };
    }

    // Find any paid item
    const paidItems = emsRes.Data.filter(i => String(i.Paid_status) === '1');
    if (paidItems.length === 0) {
      return { success: false, message: 'Registration exists on EMS but payment is pending.' };
    }

    // Separate tracks: general fee and workshops are independent purchases.
    // Workshop-only buyers must NOT be marked genfee paid.
    const generalItems = paidItems.filter(i =>
      GENERAL_REG_TYPES.includes((i.Participant_Type_Name || '').trim().toLowerCase())
    );
    const isGeneralPaid = generalItems.length > 0;

    // Attendee details: prefer the general entry, fall back to first paid item
    const emsUser = isGeneralPaid ? generalItems[0] : paidItems[0];
    const emsName = (emsUser.Name || 'Attendee').trim();
    const emsEmail = (emsUser.Email || '').trim().toLowerCase();
    const emsPhone = String(emsUser.Phone || phone).replace(/\D/g, '').slice(-10);
    const emsRegId = String(emsUser.Reg_Id || '');
    const emsTxnAmount = Number(emsUser.TxnAmount || 300);

    if (!emsEmail || !emsPhone) {
      return { success: false, message: 'Incomplete contact details on EMS.' };
    }

    // 2. Check if user already exists in DB
    let user = await User.findOne({
      $or: [
        { email: emsEmail },
        { mobile: emsPhone }
      ]
    });

    let isNewUser = false;
    const last4 = emsPhone.slice(-4);
    const defaultPassword = `Srishti@${last4}!`;

    if (!user) {
      // Auto-create new user account
      const memberId = await getNextSequence('userId');
      const hashedPassword = await bcrypt.hash(defaultPassword, 12);

      user = new User({
        memberId,
        name: emsName,
        email: emsEmail,
        password: hashedPassword,
        mobile: emsPhone,
        department: 'General',
        collegeName: 'PSG College of Technology',
        accommodation: 'No',
        genfee: isGeneralPaid ? 'paid' : '',
        emsRegId,
        emsTxnAmount,
        emsParticipantType: emsUser.Participant_Type_Name || 'Student',
        emsRegDate: emsUser.Reg_date || new Date().toISOString()
      });

      await user.save();
      isNewUser = true;
      console.log(`✨ [EMS Auto-Provision] Created account for ${emsName} (${emsEmail} / ${emsPhone}) -> SRiSHTi25${memberId} genfee=${isGeneralPaid ? 'paid' : 'unpaid'}`);
    } else {
      // Upgrade general fee only when EMS shows a general purchase.
      // Never downgrade an already-paid genfee, and never mark it paid
      // for workshop-only buyers.
      if (isGeneralPaid && user.genfee !== 'paid') {
        user.genfee = 'paid';
        console.log(`✨ [EMS Auto-Sync] Updated fee status to PAID for ${user.email}`);
      }
      if (isGeneralPaid) {
        user.emsRegId = emsRegId;
        user.emsTxnAmount = emsTxnAmount;
      }
      if (!user.name || user.name === 'Attendee') user.name = emsName;
      await user.save();
    }

    // 3. Process any workshop registrations from EMS.
    // Collect paid EMS types that match NEITHER general nor any workshop key,
    // so bulk sync can report unmapped names instead of silently missing them.
    const unmappedTypes = [];
    for (const item of paidItems) {
      const rawType = (item.Participant_Type_Name || '').trim().toLowerCase();
      const isGeneral = GENERAL_REG_TYPES.includes(rawType);
      let matchedWorkshop = false;
      for (const [key, wsCanonicalName] of Object.entries(EMS_WORKSHOP_MAP)) {
        if (rawType.includes(key) || key.includes(rawType)) {
          matchedWorkshop = true;
          await Registration.findOneAndUpdate(
            { email: user.email, type: 'workshop', name: wsCanonicalName },
            { email: user.email, type: 'workshop', name: wsCanonicalName, fees: 'paid' },
            { upsert: true, new: true }
          );
        }
      }
      if (!isGeneral && !matchedWorkshop && item.Participant_Type_Name) {
        unmappedTypes.push(String(item.Participant_Type_Name).trim());
      }
    }

    return {
      success: true,
      user,
      isNewUser,
      isGeneralPaid,
      defaultPassword,
      emsUser,
      unmappedTypes
    };
  } catch (err) {
    console.error('EMS Provisioning Error:', err);
    return { success: false, message: err.message };
  }
}

module.exports = {
  fetchEmsStatus,
  syncOrProvisionFromEms,
  EMS_WORKSHOP_MAP,
  GENERAL_REG_TYPES
};
