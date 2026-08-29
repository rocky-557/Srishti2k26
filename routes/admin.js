const express = require('express');
const router = express.Router();
const { requireAdmin, requireMasterAdmin } = require('../middleware/auth');
const {
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
} = require('../controllers/adminController');

// POST /api/admin/login — admin login (no auth required)
router.post('/login', adminLogin);

// GET /api/admin/logout — admin logout
router.get('/logout', adminLogout);

// POST /api/admin/add — add new admin (requires admin designation)
router.post('/add', requireAdmin, addAdmin);

// POST /api/admin/remove — remove admin (requires master admin)
router.post('/remove', requireMasterAdmin, removeAdmin);

// GET /api/admin/list — list all admins (requires admin)
router.get('/list', requireAdmin, listAdmins);

// POST /api/admin/members/search — search members (requires admin)
router.post('/members/search', requireAdmin, searchMembers);

// GET /api/admin/members/:id — get single member (requires admin)
router.get('/members/:id', requireAdmin, getMember);

// POST /api/admin/members/update — update member (requires admin)
router.post('/members/update', requireAdmin, updateMember);

// POST /api/admin/events/download — event-wise participant list (requires admin)
router.post('/events/download', requireAdmin, downloadEventwise);

// GET /api/admin/stats — live event statistics (requires admin)
router.get('/stats', requireAdmin, getStats);

// POST /api/admin/git-pull — pull latest from git (requires admin)
router.post('/git-pull', requireAdmin, gitPull);

module.exports = router;
