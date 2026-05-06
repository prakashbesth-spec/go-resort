// ============================================================
//  Booking Routes – routes/bookingRoutes.js
// ============================================================

const express = require('express');
const router = express.Router();
const {
  createBooking,
  getMyBookings,
  getHostBookings,
  getBooking,
  cancelBooking,
  confirmBooking,
  completeBooking,
} = require('../controllers/bookingController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { createBookingValidator } = require('../middleware/validate');

router.post('/', protect, authorize('guest', 'admin'), createBookingValidator, createBooking);
router.get('/my-bookings', protect, authorize('guest', 'admin'), getMyBookings);
router.get('/host-bookings', protect, authorize('host', 'admin'), getHostBookings);
router.get('/:id', protect, getBooking);
router.put('/:id/cancel', protect, cancelBooking);
router.put('/:id/confirm', protect, authorize('host', 'admin'), confirmBooking);
router.put('/:id/complete', protect, authorize('host', 'admin'), completeBooking);

module.exports = router;
