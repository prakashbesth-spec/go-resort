// ============================================================
//  Payment Controller – controllers/paymentController.js
// ============================================================

const asyncHandler = require('express-async-handler');
const Payment = require('../models/Payment');
const Booking = require('../models/Booking');
const {
  createRazorpayOrder,
  verifyRazorpaySignature,
  fetchPaymentDetails,
  initiateRefund,
} = require('../utils/razorpay');
const { sendPaymentSuccessEmail } = require('../utils/sendEmail');

// ─── @route  POST /api/payments/razorpay/create-order ────────
// ─── @access Private (Guest)
const createRazorpayOrderHandler = asyncHandler(async (req, res) => {
  const { bookingId } = req.body;

  const booking = await Booking.findById(bookingId);
  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }
  if (booking.guest.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized');
  }
  if (booking.paymentStatus === 'paid') {
    res.status(400);
    throw new Error('Booking is already paid');
  }

  const order = await createRazorpayOrder(
    booking.pricing.totalPrice,
    booking.confirmationCode,
    { bookingId: booking._id.toString(), guestId: req.user._id.toString() }
  );

  // Save initial payment record
  await Payment.create({
    booking: booking._id,
    user: req.user._id,
    amount: Math.round(booking.pricing.totalPrice * 100), // in paise
    currency: 'INR',
    gateway: 'razorpay',
    razorpayOrderId: order.id,
    receipt: order.receipt,
    status: 'created',
  });

  res.status(200).json({
    success: true,
    data: {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key: process.env.RAZORPAY_KEY_ID,
      bookingId: booking._id,
      confirmationCode: booking.confirmationCode,
      prefill: {
        name: req.user.name,
        email: req.user.email,
        contact: req.user.phone || '',
      },
    },
  });
});

// ─── @route  POST /api/payments/razorpay/verify ───────────────
// ─── @access Private (Guest)
const verifyRazorpayPayment = asyncHandler(async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingId } = req.body;

  // Verify HMAC signature
  const isValid = verifyRazorpaySignature(
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature
  );

  if (!isValid) {
    res.status(400);
    throw new Error('Payment verification failed – invalid signature');
  }

  // Update payment record
  const payment = await Payment.findOneAndUpdate(
    { razorpayOrderId: razorpay_order_id },
    {
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
      status: 'captured',
    },
    { new: true }
  );

  if (!payment) {
    res.status(404);
    throw new Error('Payment record not found');
  }

  // Update booking payment status
  const booking = await Booking.findByIdAndUpdate(
    bookingId || payment.booking,
    { paymentStatus: 'paid', paymentMethod: 'razorpay', status: 'confirmed' },
    { new: true }
  );

  // Send payment success email (non-blocking)
  sendPaymentSuccessEmail(payment, req.user, booking)
    .catch((e) => console.error('Payment email error:', e.message));

  res.status(200).json({
    success: true,
    message: 'Payment verified and booking confirmed!',
    data: { payment, booking },
  });
});

// ─── @route  GET /api/payments/booking/:bookingId ─────────────
// ─── @access Private
const getPaymentByBooking = asyncHandler(async (req, res) => {
  const payment = await Payment.findOne({ booking: req.params.bookingId })
    .populate('booking', 'confirmationCode status pricing')
    .populate('user', 'name email');

  if (!payment) {
    res.status(404);
    throw new Error('Payment record not found');
  }

  // Only guest, host, or admin
  const booking = await Booking.findById(req.params.bookingId);
  const isGuest = booking?.guest.toString() === req.user._id.toString();
  const isHost = booking?.host.toString() === req.user._id.toString();
  if (!isGuest && !isHost && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized');
  }

  res.status(200).json({ success: true, data: payment });
});

// ─── @route  POST /api/payments/:paymentId/refund ─────────────
// ─── @access Admin
const initiateRefundHandler = asyncHandler(async (req, res) => {
  const payment = await Payment.findById(req.params.paymentId);
  if (!payment) {
    res.status(404);
    throw new Error('Payment not found');
  }
  if (payment.status !== 'captured') {
    res.status(400);
    throw new Error('Only captured payments can be refunded');
  }

  const refundAmount = req.body.amount || null; // null = full refund
  const refund = await initiateRefund(payment.razorpayPaymentId, refundAmount);

  payment.status = 'refunded';
  payment.refundId = refund.id;
  payment.refundAmount = refund.amount / 100;
  payment.refundedAt = new Date();
  await payment.save();

  // Update booking
  await Booking.findByIdAndUpdate(payment.booking, { paymentStatus: 'refunded' });

  res.status(200).json({ success: true, message: 'Refund initiated', data: refund });
});

// ─── @route  GET /api/payments (admin) ───────────────────────
// ─── @access Admin
const getAllPayments = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const [payments, total] = await Promise.all([
    Payment.find()
      .populate('user', 'name email')
      .populate('booking', 'confirmationCode')
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(limit),
    Payment.countDocuments(),
  ]);
  res.status(200).json({ success: true, total, page, data: payments });
});

module.exports = {
  createRazorpayOrderHandler,
  verifyRazorpayPayment,
  getPaymentByBooking,
  initiateRefundHandler,
  getAllPayments,
};
