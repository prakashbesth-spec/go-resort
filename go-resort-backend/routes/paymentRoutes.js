// ============================================================
//  Payment Routes – routes/paymentRoutes.js
// ============================================================

const express = require('express');
const router = express.Router();
const {
  createRazorpayOrderHandler,
  verifyRazorpayPayment,
  getPaymentByBooking,
  initiateRefundHandler,
  getAllPayments,
} = require('../controllers/paymentController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Guest: initiate & verify payment
router.post('/razorpay/create-order', protect, authorize('guest', 'admin'), createRazorpayOrderHandler);
router.post('/razorpay/verify', protect, verifyRazorpayPayment);

// Any authenticated user (guest/host/admin): get payment for a booking
router.get('/booking/:bookingId', protect, getPaymentByBooking);

// Admin only
router.get('/', protect, authorize('admin'), getAllPayments);
router.post('/:paymentId/refund', protect, authorize('admin'), initiateRefundHandler);

module.exports = router;
