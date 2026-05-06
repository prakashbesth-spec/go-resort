// ============================================================
//  Auth Controller – controllers/authController.js
// ============================================================

const asyncHandler = require('express-async-handler');
const crypto = require('crypto');
const User = require('../models/User');
const { generateToken, clearToken } = require('../utils/generateToken');
const {
  sendWelcomeEmail,
  sendPasswordResetEmail,
} = require('../utils/sendEmail');

// ─── @route  POST /api/auth/register ─────────────────────────
// ─── @access Public
const register = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    res.status(400);
    throw new Error('An account with this email already exists');
  }

  const user = await User.create({
    name,
    email,
    password,
    role: role === 'host' ? 'host' : 'guest',
  });

  // Send welcome email (non-blocking)
  sendWelcomeEmail(user).catch((e) =>
    console.error('Welcome email failed:', e.message)
  );

  const token = generateToken(res, user._id);

  res.status(201).json({
    success: true,
    message: 'Account created successfully',
    token,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
    },
  });
});

// ─── @route  POST /api/auth/login ────────────────────────────
// ─── @access Public
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    res.status(401);
    throw new Error('Invalid email or password');
  }

  if (!user.isActive) {
    res.status(401);
    throw new Error('Your account has been deactivated. Contact support.');
  }

  const token = generateToken(res, user._id);

  res.status(200).json({
    success: true,
    message: 'Logged in successfully',
    token,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      currency: user.currency,
    },
  });
});

// ─── @route  POST /api/auth/logout ───────────────────────────
// ─── @access Private
const logout = asyncHandler(async (req, res) => {
  clearToken(res);
  res.status(200).json({ success: true, message: 'Logged out successfully' });
});

// ─── @route  GET /api/auth/me ─────────────────────────────────
// ─── @access Private
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  res.status(200).json({ success: true, data: user });
});

// ─── @route  POST /api/auth/forgot-password ──────────────────
// ─── @access Public
const forgotPassword = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    // Return success even if user not found (security: prevent email enumeration)
    return res.status(200).json({
      success: true,
      message: 'If an account with that email exists, a reset link has been sent.',
    });
  }

  const resetToken = user.getResetPasswordToken();
  await user.save({ validateBeforeSave: false });

  const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

  try {
    await sendPasswordResetEmail(user, resetUrl);
    res.status(200).json({
      success: true,
      message: 'Password reset link sent to your email',
    });
  } catch (error) {
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save({ validateBeforeSave: false });
    res.status(500);
    throw new Error('Email could not be sent. Please try again later.');
  }
});

// ─── @route  PUT /api/auth/reset-password/:token ─────────────
// ─── @access Public
const resetPassword = asyncHandler(async (req, res) => {
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpire: { $gt: Date.now() },
  });

  if (!user) {
    res.status(400);
    throw new Error('Invalid or expired reset token');
  }

  user.password = req.body.password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();

  const token = generateToken(res, user._id);
  res.status(200).json({
    success: true,
    message: 'Password reset successful',
    token,
  });
});

// ─── @route  PUT /api/auth/change-password ───────────────────
// ─── @access Private
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select('+password');

  if (!(await user.comparePassword(currentPassword))) {
    res.status(401);
    throw new Error('Current password is incorrect');
  }

  user.password = newPassword;
  await user.save();

  const token = generateToken(res, user._id);
  res.status(200).json({
    success: true,
    message: 'Password changed successfully',
    token,
  });
});

module.exports = {
  register,
  login,
  logout,
  getMe,
  forgotPassword,
  resetPassword,
  changePassword,
};
