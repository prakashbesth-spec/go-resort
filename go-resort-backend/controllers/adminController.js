// ============================================================
//  Admin Controller – controllers/adminController.js
// ============================================================

const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const Property = require('../models/Property');
const Booking = require('../models/Booking');
const Review = require('../models/Review');
const Payment = require('../models/Payment');
const Blog = require('../models/Blog');

// ─── @route  GET /api/admin/dashboard ────────────────────────
// ─── @access Admin
const getDashboardStats = asyncHandler(async (req, res) => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

  const [
    totalUsers,
    totalHosts,
    totalProperties,
    pendingProperties,
    totalBookings,
    confirmedBookings,
    totalRevenueResult,
    monthlyRevenueResult,
    lastMonthRevenueResult,
    recentBookings,
    recentUsers,
  ] = await Promise.all([
    User.countDocuments({ role: { $ne: 'admin' } }),
    User.countDocuments({ role: 'host' }),
    Property.countDocuments({ isApproved: true }),
    Property.countDocuments({ isApproved: false }),
    Booking.countDocuments(),
    Booking.countDocuments({ status: 'confirmed' }),
    Payment.aggregate([
      { $match: { status: 'captured' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Payment.aggregate([
      { $match: { status: 'captured', createdAt: { $gte: startOfMonth } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Payment.aggregate([
      {
        $match: {
          status: 'captured',
          createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth },
        },
      },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Booking.find()
      .populate('guest', 'name email avatar')
      .populate('property', 'title images')
      .sort('-createdAt')
      .limit(5),
    User.find().sort('-createdAt').limit(5).select('name email role avatar createdAt'),
  ]);

  const totalRevenue = (totalRevenueResult[0]?.total || 0) / 100;
  const monthlyRevenue = (monthlyRevenueResult[0]?.total || 0) / 100;
  const lastMonthRevenue = (lastMonthRevenueResult[0]?.total || 0) / 100;
  const revenueGrowth =
    lastMonthRevenue > 0
      ? (((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100).toFixed(1)
      : 100;

  res.status(200).json({
    success: true,
    data: {
      stats: {
        totalUsers,
        totalHosts,
        totalProperties,
        pendingProperties,
        totalBookings,
        confirmedBookings,
        totalRevenue,
        monthlyRevenue,
        revenueGrowth: Number(revenueGrowth),
      },
      recentBookings,
      recentUsers,
    },
  });
});

// ─── @route  GET /api/admin/properties/pending ────────────────
// ─── @access Admin
const getPendingProperties = asyncHandler(async (req, res) => {
  const properties = await Property.find({ isApproved: false })
    .populate('host', 'name email avatar')
    .sort('-createdAt');
  res.status(200).json({ success: true, count: properties.length, data: properties });
});

// ─── @route  GET /api/admin/bookings ─────────────────────────
// ─── @access Admin
const getAllBookings = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const filter = {};
  if (req.query.status) filter.status = req.query.status;

  const [bookings, total] = await Promise.all([
    Booking.find(filter)
      .populate('property', 'title location')
      .populate('guest', 'name email')
      .populate('host', 'name email')
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(limit),
    Booking.countDocuments(filter),
  ]);

  res.status(200).json({ success: true, total, page, pages: Math.ceil(total / limit), data: bookings });
});

// ─── @route  PUT /api/admin/users/:id/role ───────────────────
// ─── @access Admin
const changeUserRole = asyncHandler(async (req, res) => {
  const { role } = req.body;
  if (!['guest', 'host', 'admin'].includes(role)) {
    res.status(400);
    throw new Error('Invalid role. Must be guest, host, or admin');
  }
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { role },
    { new: true, runValidators: true }
  );
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  res.status(200).json({ success: true, message: `User role updated to ${role}`, data: user });
});

// ─── @route  GET /api/admin/reviews ──────────────────────────
// ─── @access Admin
const getAllReviews = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const filter = {};
  if (req.query.reported) filter.reportedBy = { $exists: true, $ne: [] };

  const [reviews, total] = await Promise.all([
    Review.find(filter)
      .populate('guest', 'name email')
      .populate('property', 'title')
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(limit),
    Review.countDocuments(filter),
  ]);

  res.status(200).json({ success: true, total, page, data: reviews });
});

// ─── @route  PUT /api/admin/reviews/:id/toggle ───────────────
// ─── @access Admin
const toggleReviewApproval = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) {
    res.status(404);
    throw new Error('Review not found');
  }
  review.isApproved = !review.isApproved;
  await review.save();
  res.status(200).json({
    success: true,
    message: `Review ${review.isApproved ? 'approved' : 'hidden'}`,
    data: review,
  });
});

// ─── @route  GET /api/admin/revenue/monthly ──────────────────
// ─── @access Admin
const getMonthlyRevenue = asyncHandler(async (req, res) => {
  const year = parseInt(req.query.year, 10) || new Date().getFullYear();

  const revenueData = await Payment.aggregate([
    {
      $match: {
        status: 'captured',
        createdAt: { $gte: new Date(`${year}-01-01`), $lt: new Date(`${year + 1}-01-01`) },
      },
    },
    {
      $group: {
        _id: { month: { $month: '$createdAt' } },
        revenue: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
    { $sort: { '_id.month': 1 } },
  ]);

  // Fill all 12 months
  const months = Array.from({ length: 12 }, (_, i) => {
    const monthData = revenueData.find((d) => d._id.month === i + 1);
    return {
      month: i + 1,
      revenue: monthData ? monthData.revenue / 100 : 0,
      bookings: monthData ? monthData.count : 0,
    };
  });

  res.status(200).json({ success: true, year, data: months });
});

module.exports = {
  getDashboardStats,
  getPendingProperties,
  getAllBookings,
  changeUserRole,
  getAllReviews,
  toggleReviewApproval,
  getMonthlyRevenue,
};
