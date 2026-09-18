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
  gitPull,
  onSpotRegister,
  adminLookupUser,
  adminResetPassword,
  deleteMember,
  deduplicateUsers,
  updateRegistrations,
  getDuplicates,
  getEmsPreview,
  pushEmsCopy,
  syncAllEms
} = require('../controllers/adminController');

// POST /api/admin/login — admin login (no auth required)
router.post('/login', adminLogin);

// GET /api/admin/logout — admin logout
router.get('/logout', adminLogout);

// POST /api/admin/onspot-register — on-spot registration (requires admin)
router.post('/onspot-register', requireAdmin, onSpotRegister);

// POST /api/admin/user/lookup — lookup user by ID/Email/Mobile (requires admin)
router.post('/user/lookup', requireAdmin, adminLookupUser);

// POST /api/admin/user/reset-password-direct — reset user password by ID (requires admin)
router.post('/user/reset-password-direct', requireAdmin, adminResetPassword);

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

// POST /api/admin/members/update-registrations — add/remove registrations (requires admin)
router.post('/members/update-registrations', requireAdmin, updateRegistrations);

// POST /api/admin/members/delete — delete member (requires admin)
router.post('/members/delete', requireAdmin, deleteMember);

// POST /api/admin/deduplicate-users — deduplicate duplicate mobiles and reconcile with EMS (requires admin)
router.post('/deduplicate-users', requireAdmin, deduplicateUsers);

// POST /api/admin/sync-all-ems — bulk EMS reconcile + fresh totals (requires admin)
router.post('/sync-all-ems', requireAdmin, syncAllEms);

// DB Repair — duplicates handling (requires admin)
router.get('/db-repair/duplicates', requireAdmin, getDuplicates);
router.get('/db-repair/ems-preview', requireAdmin, getEmsPreview);
router.post('/db-repair/push-ems', requireAdmin, pushEmsCopy);

// ALL /api/admin/events/download — event-wise participant list (requires admin)
router.all('/events/download', requireAdmin, downloadEventwise);

// ALL /api/admin/stats — live event statistics (requires admin or passkey 2026)
router.all('/stats', getStats);

// POST /api/admin/git-pull — pull latest from git & reload PM2 (requires admin)
router.post('/git-pull', requireAdmin, gitPull);

module.exports = router;
