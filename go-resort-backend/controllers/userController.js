// ============================================================
//  User Controller – controllers/userController.js
// ============================================================

const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const { cloudinary } = require('../config/cloudinary');

// ─── @route  GET /api/users/profile ──────────────────────────
// ─── @access Private
const getMyProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  res.status(200).json({ success: true, data: user });
});

// ─── @route  PUT /api/users/profile ──────────────────────────
// ─── @access Private
const updateProfile = asyncHandler(async (req, res) => {
  const allowedFields = ['name', 'phone', 'currency', 'hostInfo'];
  const updates = {};
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  });

  // Handle avatar upload
  if (req.file) {
    const user = await User.findById(req.user._id);
    // Delete old avatar from Cloudinary
    if (user.avatar?.public_id) {
      await cloudinary.uploader.destroy(user.avatar.public_id);
    }
    updates.avatar = {
      public_id: req.file.filename,
      url: req.file.path,
    };
  }

  const user = await User.findByIdAndUpdate(req.user._id, updates, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    success: true,
    message: 'Profile updated successfully',
    data: user,
  });
});

// ─── @route  GET /api/users/:id ───────────────────────────────
// ─── @access Public (public host profile)
const getPublicProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select(
    'name avatar hostInfo createdAt role'
  );
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  res.status(200).json({ success: true, data: user });
});

// ─── @route  GET /api/users ───────────────────────────────────
// ─── @access Admin
const getAllUsers = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const skip = (page - 1) * limit;

  const filter = {};
  if (req.query.role) filter.role = req.query.role;
  if (req.query.search) {
    filter.$or = [
      { name: { $regex: req.query.search, $options: 'i' } },
      { email: { $regex: req.query.search, $options: 'i' } },
    ];
  }

  const [users, total] = await Promise.all([
    User.find(filter).sort('-createdAt').skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    total,
    page,
    pages: Math.ceil(total / limit),
    data: users,
  });
});

// ─── @route  DELETE /api/users/:id ───────────────────────────
// ─── @access Admin
const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  if (user.role === 'admin') {
    res.status(403);
    throw new Error('Cannot delete another admin account');
  }
  await user.deleteOne();
  res.status(200).json({ success: true, message: 'User deleted successfully' });
});

// ─── @route  PUT /api/users/:id/deactivate ───────────────────
// ─── @access Admin
const toggleUserStatus = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  user.isActive = !user.isActive;
  await user.save();
  res.status(200).json({
    success: true,
    message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`,
    data: { isActive: user.isActive },
  });
});

module.exports = {
  getMyProfile,
  updateProfile,
  getPublicProfile,
  getAllUsers,
  deleteUser,
  toggleUserStatus,
};
