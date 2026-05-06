// ============================================================
//  Booking Model – models/Booking.js
// ============================================================

const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
      required: [true, 'Property reference is required'],
    },
    guest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Guest reference is required'],
    },
    host: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Host reference is required'],
    },

    // Dates
    checkIn: { type: Date, required: [true, 'Check-in date is required'] },
    checkOut: { type: Date, required: [true, 'Check-out date is required'] },

    // Guests breakdown
    guests: {
      adults: { type: Number, required: true, min: 1, default: 1 },
      children: { type: Number, default: 0, min: 0 },
      infants: { type: Number, default: 0, min: 0 },
      pets: { type: Number, default: 0, min: 0 },
    },

    // Pricing snapshot (locked at booking time)
    pricing: {
      pricePerNight: { type: Number, required: true },
      totalNights: { type: Number, required: true },
      subTotal: { type: Number, required: true },
      cleaningFee: { type: Number, default: 0 },
      serviceFee: { type: Number, default: 0 },
      taxes: { type: Number, default: 0 },
      totalPrice: { type: Number, required: true },
      currency: { type: String, default: 'INR' },
    },

    // Booking status
    status: {
      type: String,
      enum: {
        values: ['pending', 'confirmed', 'cancelled', 'completed', 'no-show'],
        message: 'Invalid booking status',
      },
      default: 'pending',
    },

    // Payment
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'paid', 'partially-paid', 'refunded', 'failed'],
      default: 'unpaid',
    },
    paymentMethod: {
      type: String,
      enum: ['razorpay', 'bank-transfer', 'cash', 'pending'],
      default: 'pending',
    },

    // Special requests
    specialRequests: { type: String, maxlength: 500 },

    // Cancellation
    cancellationReason: String,
    cancelledAt: Date,
    cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // Review flag
    guestReviewed: { type: Boolean, default: false },
    hostReviewed: { type: Boolean, default: false },

    // Confirmation code
    confirmationCode: {
      type: String,
      unique: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Indexes ──────────────────────────────────────────────────
bookingSchema.index({ property: 1, checkIn: 1, checkOut: 1 });
bookingSchema.index({ guest: 1, status: 1 });
bookingSchema.index({ host: 1, status: 1 });

// ─── Virtual: Total guests count ──────────────────────────────
bookingSchema.virtual('totalGuestsCount').get(function () {
  return (
    (this.guests?.adults || 0) +
    (this.guests?.children || 0) +
    (this.guests?.infants || 0)
  );
});

// ─── Pre-save: Generate confirmation code & calculate nights ──
bookingSchema.pre('save', function (next) {
  if (this.isNew) {
    // Generate unique confirmation code
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'GR-';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    this.confirmationCode = code;

    // Calculate nights & prices
    const msPerDay = 1000 * 60 * 60 * 24;
    const nights = Math.ceil(
      (new Date(this.checkOut) - new Date(this.checkIn)) / msPerDay
    );
    this.pricing.totalNights = nights;
    this.pricing.subTotal = nights * this.pricing.pricePerNight;
    this.pricing.taxes = Math.round(this.pricing.subTotal * 0.12); // 12% GST
    this.pricing.totalPrice =
      this.pricing.subTotal +
      this.pricing.cleaningFee +
      this.pricing.serviceFee +
      this.pricing.taxes;
  }
  next();
});

// ─── Validate check-out is after check-in ─────────────────────
bookingSchema.pre('validate', function (next) {
  if (this.checkOut <= this.checkIn) {
    return next(new Error('Check-out date must be after check-in date'));
  }
  next();
});

module.exports = mongoose.model('Booking', bookingSchema);
