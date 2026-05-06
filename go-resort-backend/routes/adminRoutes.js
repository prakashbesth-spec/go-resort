// ============================================================
//  Admin Routes – routes/adminRoutes.js
// ============================================================

const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
  getPendingProperties,
  getAllBookings,
  changeUserRole,
  getAllReviews,
  toggleReviewApproval,
  getMonthlyRevenue,
} = require('../controllers/adminController');
const { getAllUsers, deleteUser, toggleUserStatus } = require('../controllers/userController');
const { approveProperty } = require('../controllers/propertyController');
const { protect, authorize } = require('../middleware/authMiddleware');

// All admin routes are protected with admin role
router.use(protect, authorize('admin'));

router.get('/dashboard', getDashboardStats);
router.get('/revenue/monthly', getMonthlyRevenue);

router.get('/properties/pending', getPendingProperties);
router.put('/properties/:id/approve', approveProperty);

router.get('/bookings', getAllBookings);

router.get('/users', getAllUsers);
router.delete('/users/:id', deleteUser);
router.put('/users/:id/role', changeUserRole);
router.put('/users/:id/toggle-status', toggleUserStatus);

router.get('/reviews', getAllReviews);
router.put('/reviews/:id/toggle', toggleReviewApproval);

module.exports = router;
