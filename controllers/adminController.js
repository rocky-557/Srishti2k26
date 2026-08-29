/**
 * Admin Controller — handles all admin panel operations.
 * 
 * Ports:
 *   adminlogin/login_process.php        → adminLogin()
 *   adminlogin/add_admin_process.php    → addAdmin()
 *   adminlogin/remove_admin_process.php → removeAdmin()
 *   adminlogin/search_members.php       → searchMembers()
 *   adminlogin/update_member.php        → updateMember()
 *   adminlogin/download_eventwise.php   → downloadEventwise()
 *   adminlogin/event_stats.php          → getStats()
 */
const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');
const User = require('../models/User');
const Registration = require('../models/Registration');
const Payment = require('../models/Payment');

/**
 * POST /api/admin/login
 * 
 * Mirrors adminlogin/login_process.php
 */
async function adminLogin(req, res) {
  const response = { status: 'error', message: 'An unknown error occurred.' };

  try {
    const { username, password, designation } = req.body;

    if (!username || !password) {
      response.message = 'Please fill in all fields.';
      return res.json(response);
    }

    const admin = await Admin.findOne({ user: username });

    if (!admin) {
      response.message = 'Incorrect username or password.';
      return res.json(response);
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      response.message = 'Incorrect username or password.';
      return res.json(response);
    }

    if (designation && designation !== admin.designation) {
      response.message = 'Incorrect designation for this username.';
      return res.json(response);
    }

    // Set admin session & explicitly save before response
    req.session.admin_user = admin.user;
    req.session.admin_designation = admin.designation;

    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.json({ status: 'error', message: 'Session error.' });
      }
      response.status = 'success';
      response.message = 'Login successful! Redirecting...';
      return res.json(response);
    });
  } catch (err) {
    console.error('Admin login error:', err);
    response.message = 'Server error.';
    return res.json(response);
  }
}

/**
 * GET /api/admin/logout
 */
function adminLogout(req, res) {
  req.session.destroy((err) => {
    if (err) console.error('Admin logout error:', err);
    res.clearCookie('connect.sid');
    res.redirect('/adminlogin/ad-login.html');
  });
}

/**
 * POST /api/admin/add
 * 
 * Mirrors adminlogin/add_admin_process.php
 */
async function addAdmin(req, res) {
  const response = { status: 'error', message: 'An unauthorized action occurred.' };

  try {
    // Only 'admin' designation can add new admins
    if (!req.session.admin_designation || req.session.admin_designation !== 'admin') {
      response.message = 'You do not have permission to perform this action.';
      return res.json(response);
    }

    const { user, password, designation } = req.body;
    if (!user || !password || !designation) {
      response.message = 'All fields are required.';
      return res.json(response);
    }

    // Check if admin already exists
    const existing = await Admin.findOne({ user });
    if (existing) {
      response.message = 'An admin with this username already exists.';
      return res.json(response);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    await Admin.create({ user, password: hashedPassword, designation });

    response.status = 'success';
    response.message = 'New admin has been added successfully with a secure password!';
    return res.json(response);
  } catch (err) {
    console.error('Add admin error:', err);
    response.message = 'Database error: Could not add the new admin.';
    return res.json(response);
  }
}

/**
 * POST /api/admin/remove
 * 
 * Mirrors adminlogin/remove_admin_process.php
 * Only master admin (Gannadheesh Raj) can remove admins.
 */
async function removeAdmin(req, res) {
  const response = { status: 'error', message: 'An unknown error occurred.' };

  try {
    const userToDelete = req.body.user_to_delete;

    // Master admins cannot delete themselves
    const protectedAdmins = ['Sri Raghav', 'Niranjan'];
    if (protectedAdmins.includes(userToDelete)) {
      response.message = 'Master admin account cannot be removed.';
      return res.json(response);
    }

    const result = await Admin.deleteOne({ user: userToDelete });

    if (result.deletedCount > 0) {
      response.status = 'success';
      response.message = `Admin ${userToDelete} has been removed.`;
    } else {
      response.message = 'Admin not found.';
    }

    return res.json(response);
  } catch (err) {
    console.error('Remove admin error:', err);
    response.message = 'Database error: ' + err.message;
    return res.json(response);
  }
}

async function searchMembers(req, res) {
  try {
    const query = req.body.query || req.body.search || req.query.query || '';
    const wantsJson = req.headers.accept?.includes('application/json') || req.body.format === 'json' || req.query.format === 'json';

    let members;
    if (!query || query.trim() === '') {
      members = await User.find({}).sort({ memberId: -1 }).limit(100);
    } else {
      const regex = new RegExp(query.trim(), 'i');
      members = await User.find({
        $or: [
          { name: regex },
          { email: regex },
          { mobile: regex },
          { collegeName: regex }
        ]
      }).sort({ memberId: -1 });
    }

    if (wantsJson) {
      return res.json(members);
    }

    if (members.length === 0) {
      return res.send('<tr><td colspan="7" class="text-center">No members found matching your search.</td></tr>');
    }

    // Build HTML table rows (same format as PHP)
    let html = '';
    for (const m of members) {
      const feeStatus = (m.genfee || '').charAt(0).toUpperCase() + (m.genfee || '').slice(1);
      const badgeClass = m.genfee === 'paid' ? 'bg-success' : 'bg-warning text-dark';
      const id = m.memberId || '';

      html += `<tr>`;
      html += `<td>${id}</td>`;
      html += `<td>${escHtml(m.name)}</td>`;
      html += `<td>${escHtml(m.email)}</td>`;
      html += `<td>${escHtml(m.mobile)}</td>`;
      html += `<td>${escHtml(m.collegeName)}</td>`;
      html += `<td><span class='badge ${badgeClass}'>${feeStatus}</span></td>`;
      html += `<td><a href='update_member.html?id=${id}' class='btn btn-sm btn-primary'><i class='bi bi-pencil-square'></i> Edit</a></td>`;
      html += `</tr>`;
    }

    return res.send(html);
  } catch (err) {
    console.error('Search members error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
}

/**
 * GET /api/admin/members/:id
 * Fetch a single member by their memberId for the edit form.
 */
async function getMember(req, res) {
  try {
    const memberId = parseInt(req.params.id);
    const user = await User.findOne({ memberId });
    if (!user) {
      return res.status(404).json({ error: 'Member not found' });
    }

    // Fetch registrations
    const events = await Registration.find({ email: user.email, type: 'event' }).select('name -_id');
    const workshops = await Registration.find({ email: user.email, type: 'workshop' }).select('name fees -_id');
    const papers = await Registration.find({ email: user.email, type: 'paper' }).select('name -_id');
    const flagship = await Registration.find({ email: user.email, type: 'flagship' }).select('name -_id');

    return res.json({
      id: user.memberId,
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      cgname: user.collegeName,
      events: events.map(e => e.name).join(', '),
      workshops: workshops.map(w => w.name).join(', '),
      paperpres: papers.map(p => p.name).join(', '),
      flagship: flagship.map(f => f.name).join(', '),
      genfee: user.genfee || '',
      accomodation: user.accommodation || 'No'
    });
  } catch (err) {
    console.error('Get member error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

/**
 * POST /api/admin/members/update
 * 
 * Mirrors adminlogin/update_member.php
 */
async function updateMember(req, res) {
  try {
    const { id, name, email, mobile, cgname, genfee, accomodation } = req.body;
    const memberId = parseInt(id);

    const result = await User.updateOne(
      { memberId },
      {
        name,
        email,
        mobile,
        collegeName: cgname,
        genfee,
        accommodation: accomodation
      }
    );

    if (result.modifiedCount > 0 || result.matchedCount > 0) {
      return res.json({ status: 'success', message: 'Member details updated successfully!' });
    } else {
      return res.json({ status: 'error', message: 'Member not found.' });
    }
  } catch (err) {
    console.error('Update member error:', err);
    return res.json({ status: 'error', message: 'Error updating record: ' + err.message });
  }
}

/**
 * POST /api/admin/events/download
 * 
 * Mirrors adminlogin/download_eventwise.php
 * Returns HTML table rows for event-wise participant lists.
 */
async function downloadEventwise(req, res) {
  try {
    const eventType = (req.body && req.body.event_type) || req.query.event_type;
    const eventName = (req.body && req.body.event_name) || req.query.event_name;
    const format = (req.body && req.body.format) || req.query.format;

    const isCsv = format === 'csv' || format === 'xls';

    // Handle 'Paid' users list
    if (eventType === 'Paid') {
      const payments = await Payment.find({ paymentStatus: 'success' }).sort({ addedOn: -1 });

      if (isCsv) {
        let csv = 'SRiSHTi ID,Name,Email,Mobile,College,Transaction ID,Amount,Date\n';
        for (const p of payments) {
          const user = await User.findOne({ memberId: p.memberId });
          const name = user ? user.name : p.name;
          const email = user ? user.email : '';
          const mobile = user ? user.mobile : '';
          const college = user ? user.collegeName : '';
          const dateStr = p.addedOn ? p.addedOn.toISOString().replace('T', ' ').substring(0, 19) : '';
          csv += `"${p.memberId}","${csvEsc(name)}","${csvEsc(email)}","${csvEsc(mobile)}","${csvEsc(college)}","${csvEsc(p.transactionId)}","${p.amount}","${dateStr}"\n`;
        }
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="SRiSHTi2k26_Paid_Users.csv"');
        return res.send(csv);
      }

      if (payments.length === 0) {
        return res.send('<tr><td colspan="8" class="text-center">No successful payment records found.</td></tr>');
      }

      let html = '';
      for (const p of payments) {
        const user = await User.findOne({ memberId: p.memberId });
        html += `<tr>`;
        html += `<td>${p.memberId}</td>`;
        html += `<td>${escHtml(user ? user.name : p.name)}</td>`;
        html += `<td>${escHtml(user ? user.email : '')}</td>`;
        html += `<td>${escHtml(user ? user.mobile : '')}</td>`;
        html += `<td>${escHtml(user ? user.collegeName : '')}</td>`;
        html += `<td>${escHtml(p.transactionId)}</td>`;
        html += `<td>${p.amount}</td>`;
        html += `<td>${p.addedOn ? p.addedOn.toISOString().replace('T', ' ').substring(0, 19) : ''}</td>`;
        html += `</tr>`;
      }
      return res.send(html);
    }

    // Handle event-wise downloads
    if (!eventName) {
      return isCsv ? res.status(400).send('No event specified.') : res.send('<tr><td colspan="7" class="text-center">No event specified.</td></tr>');
    }

    // Map event_type to registration type
    let regType;
    switch (eventType) {
      case 'Technical':
      case 'Non-Technical':
      case 'Gaming':
        regType = 'event'; break;
      case 'Workshop':
        regType = 'workshop'; break;
      case 'Paper':
        regType = 'paper'; break;
      case 'Flagship':
      case 'Bots':
        regType = 'flagship'; break;
      default:
        return isCsv ? res.status(400).send('Invalid Event Type') : res.send('<tr><td colspan="7" class="text-center">Invalid Event Type</td></tr>');
    }

    // Find all registrations for this event (case-insensitive)
    const regexName = new RegExp(`^${eventName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
    const registrations = await Registration.find({ type: regType, name: regexName });
    const emails = registrations.map(r => r.email);

    const members = await User.find({ email: { $in: emails } });

    if (isCsv) {
      let csv = 'SRiSHTi ID,Name,Email,Mobile,College,General Fee,Accommodation\n';
      for (const m of members) {
        csv += `"${m.memberId || ''}","${csvEsc(m.name)}","${csvEsc(m.email)}","${csvEsc(m.mobile)}","${csvEsc(m.collegeName)}","${csvEsc(m.genfee || '')}","${csvEsc(m.accommodation || '')}"\n`;
      }
      const safeName = eventName.replace(/[^a-zA-Z0-9]/g, '_');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="SRiSHTi2k26_${safeName}.csv"`);
      return res.send(csv);
    }

    if (members.length === 0) {
      return res.send('<tr><td colspan="7" class="text-center">No participants found for this event.</td></tr>');
    }

    let html = '';
    for (const m of members) {
      html += `<tr>`;
      html += `<td>${m.memberId || ''}</td>`;
      html += `<td>${escHtml(m.name)}</td>`;
      html += `<td>${escHtml(m.email)}</td>`;
      html += `<td>${escHtml(m.mobile)}</td>`;
      html += `<td>${escHtml(m.collegeName)}</td>`;
      html += `<td>${escHtml(m.genfee || '')}</td>`;
      html += `<td>${escHtml(m.accommodation || '')}</td>`;
      html += `</tr>`;
    }
    return res.send(html);
  } catch (err) {
    console.error('Download eventwise error:', err);
    return res.send('<tr><td colspan="7" class="text-center">Server error.</td></tr>');
  }
}

function csvEsc(str) {
  if (!str) return '';
  return String(str).replace(/"/g, '""');
}

/**
 * GET /api/admin/stats
 * 
 * Mirrors adminlogin/event_stats.php
 * Returns JSON with all event counts for the stats page.
 */
async function getStats(req, res) {
  try {
    // Srishti 2k26 Canonical Event Configuration from EVENT HALL SPLITUP.pdf
    const technicalEvents = [
      'TECH NEXUS',
      'BRAINBYTE 2026',
      'THRILLER TECHSCAPE',
      'TECHTOPIA'
    ];

    const nonTechnicalEvents = [
      'CASE ZERO : THE FINAL VERDICT',
      'MYSTERY VOYAGE – Unveil the truth',
      'ROAD TO ENDGAME',
      'INFINITY CHASE'
    ];

    const flagshipEvents = [
      'DEVSPRINT',
      'REVERSE ENGINEERING CHALLENGE',
      'VisionX'
    ];

    const botEvents = [
      'MAZEBOTICS – RESCUE PROTOCOL',
      'ROBO DOMINION -Where Strategy Meets Strength',
      'BOT BLITZ'
    ];

    const gamingEvents = [
      'MARVEL ROYALE',
      'BATTLE NEXUS',
      'THE AUCTION ARENA'
    ];

    const paperPresentations = [
      'TwinTech 2026',
      'VoltIQ 2026',
      'Mediverse',
      'NextGen',
      'NextWave'
    ];

    const workshopNames = [
      'From Pixels to Intelligence: Hands-on Computer Vision with YOLO',
      'Powering Future Mobility: Hands-on EV Electronics Design with KiCad',
      'Automotive ECU Development: Hands-on Model-Based Design with Simulink',
      'Power Electronics: From MATLAB Simulation to Hardware Implementation',
      'Industrial IoT & Industry 4.0 – Industrial Communication Protocols, Edge Gateways & Cloud Data Visualization',
      'The Future of Automotive Safety: Advanced Driver Assistance Systems (ADAS)',
      'ROS 2 Jazzy: From Bot simulation to Autonomous Robotics with TurtleBot3',
      'Building Your Own AI Assistant: From Concept to Implementation',
      'UI/UX Design with Figma & AI: From Ideas to Interactive Prototypes',
      'AI-Powered Digital Twins: Modeling, Simulation & Intelligent Systems'
    ];

    // Helper to get counts (case-insensitive)
    async function getCounts(type, names) {
      const counts = {};
      for (const name of names) {
        const regex = new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
        counts[name] = await Registration.countDocuments({ type, name: regex });
      }
      return counts;
    }

    async function getPaidWorkshopCounts(names) {
      const counts = {};
      for (const name of names) {
        const regex = new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
        counts[name] = await Registration.countDocuments({ type: 'workshop', name: regex, fees: 'paid' });
      }
      return counts;
    }

    const [
      technicalCounts,
      nonTechnicalCounts,
      flagshipCounts,
      botCounts,
      gamingCounts,
      paperCounts,
      workshopCounts,
      totalSignups,
      totalPaid,
      totalWorkshopPaid
    ] = await Promise.all([
      getCounts('event', technicalEvents),
      getCounts('event', nonTechnicalEvents),
      getCounts('flagship', flagshipEvents),
      getCounts('flagship', botEvents),
      getCounts('event', gamingEvents),
      getCounts('paper', paperPresentations),
      getPaidWorkshopCounts(workshopNames),
      User.countDocuments(),
      User.countDocuments({ genfee: 'paid' }),
      Registration.countDocuments({ type: 'workshop', fees: 'paid' })
    ]);

    return res.json({
      date: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
      totalSignups,
      totalPaid,
      totalWorkshopPaid,
      technical: { events: technicalEvents, counts: technicalCounts },
      nonTechnical: { events: nonTechnicalEvents, counts: nonTechnicalCounts },
      flagship: { events: flagshipEvents, counts: flagshipCounts },
      bots: { events: botEvents, counts: botCounts },
      gaming: { events: gamingEvents, counts: gamingCounts },
      papers: { events: paperPresentations, counts: paperCounts },
      workshops: { events: workshopNames, counts: workshopCounts }
    });
  } catch (err) {
    console.error('Stats error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

/**
 * GET /api/admin/list
 * Returns the list of all admins (for the admin management panel).
 */
async function listAdmins(req, res) {
  try {
    const admins = await Admin.find({}, 'user designation -_id');
    return res.json(admins);
  } catch (err) {
    console.error('List admins error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

// Simple HTML escaping helper
function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * POST /api/admin/git-pull
 * Pulls the latest code from git using child_process.exec.
 */
async function gitPull(req, res) {
  const { exec } = require('child_process');
  // Optional: you can run 'git pull && pm2 restart server' depending on your setup.
  exec('git pull', { cwd: process.cwd() }, (error, stdout, stderr) => {
    if (error) {
      console.error(`Git pull error: ${error.message}`);
      return res.status(500).json({ error: error.message, stderr });
    }
    return res.json({ success: true, message: stdout || 'Pulled successfully.' });
  });
}

module.exports = {
  adminLogin,
  adminLogout,
  addAdmin,
  removeAdmin,
  searchMembers,
  getMember,
  updateMember,
  downloadEventwise,
  getStats,
  listAdmins,
  gitPull
};
