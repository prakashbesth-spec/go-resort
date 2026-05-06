// ============================================================
//  User Model – models/User.js
// ============================================================

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const validator = require('validator');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide your name'],
      trim: true,
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Please provide an email'],
      unique: true,
      lowercase: true,
      validate: [validator.isEmail, 'Please provide a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false, // Never returned in queries by default
    },
    role: {
      type: String,
      enum: {
        values: ['guest', 'host', 'admin'],
        message: 'Role must be guest, host, or admin',
      },
      default: 'guest',
    },
    avatar: {
      public_id: { type: String, default: null },
      url: {
        type: String,
        default: 'https://res.cloudinary.com/demo/image/upload/v1/go-resort/avatars/default-avatar',
      },
    },
    phone: {
      type: String,
      validate: {
        validator: function (v) {
          return !v || /^\+?[\d\s\-()]{7,15}$/.test(v);
        },
        message: 'Please provide a valid phone number',
      },
    },
    isVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },

    // Password Reset
    resetPasswordToken: String,
    resetPasswordExpire: Date,

    // Email Verification
    emailVerificationToken: String,
    emailVerificationExpire: Date,

    // Host-specific info
    hostInfo: {
      bio: { type: String, maxlength: 500 },
      languages: [String],
      responseRate: { type: Number, default: 0 },
      responseTime: { type: String, default: 'Within a day' },
      isSuperhost: { type: Boolean, default: false },
      joinedDate: Date,
    },

    // Preferences
    currency: { type: String, default: 'INR' },
    wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Property' }],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Virtual: Properties listed by this host ──────────────────
userSchema.virtual('properties', {
  ref: 'Property',
  localField: '_id',
  foreignField: 'host',
});

// ─── Pre-save: Hash password ──────────────────────────────────
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// ─── Method: Compare passwords ────────────────────────────────
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// ─── Method: Generate password reset token ────────────────────
userSchema.methods.getResetPasswordToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  this.resetPasswordExpire = Date.now() + 15 * 60 * 1000; // 15 minutes
  return resetToken;
};

// ─── Method: Generate email verification token ────────────────
userSchema.methods.getEmailVerificationToken = function () {
  const token = crypto.randomBytes(32).toString('hex');
  this.emailVerificationToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
  this.emailVerificationExpire = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  return token;
};

module.exports = mongoose.model('User', userSchema);
