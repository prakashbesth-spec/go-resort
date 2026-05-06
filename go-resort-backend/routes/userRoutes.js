// ============================================================
//  User Routes – routes/userRoutes.js
// ============================================================

const express = require('express');
const router = express.Router();
const {
  getMyProfile,
  updateProfile,
  getPublicProfile,
  getAllUsers,
  deleteUser,
  toggleUserStatus,
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { uploadAvatar } = require('../middleware/uploadMiddleware');

// Own profile
router.get('/profile', protect, getMyProfile);
router.put('/profile', protect, uploadAvatar, updateProfile);

// Public host profile
router.get('/:id', getPublicProfile);

// Admin routes
router.get('/', protect, authorize('admin'), getAllUsers);
router.delete('/:id', protect, authorize('admin'), deleteUser);
router.put('/:id/toggle-status', protect, authorize('admin'), toggleUserStatus);

module.exports = router;
