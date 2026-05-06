// ============================================================
//  Payment Model – models/Payment.js
// ============================================================

const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    amount: { type: Number, required: true },        // in paise (INR)
    currency: { type: String, default: 'INR' },
    gateway: { type: String, enum: ['razorpay'], default: 'razorpay' },

    // Razorpay fields
    razorpayOrderId: { type: String },
    razorpayPaymentId: { type: String },
    razorpaySignature: { type: String },

    status: {
      type: String,
      enum: ['created', 'authorized', 'captured', 'failed', 'refunded'],
      default: 'created',
    },

    // Refund info
    refundId: String,
    refundAmount: Number,
    refundedAt: Date,

    // Receipt
    receipt: String,
    notes: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true }
);

paymentSchema.index({ booking: 1 });
paymentSchema.index({ user: 1 });
paymentSchema.index({ razorpayOrderId: 1 });
paymentSchema.index({ razorpayPaymentId: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
