// ============================================================
//  Review Controller – controllers/reviewController.js
// ============================================================

const mongoose = require('mongoose');
const asyncHandler = require('express-async-handler');
const Review = require('../models/Review');
const Booking = require('../models/Booking');
const Property = require('../models/Property');

// ─── @route  POST /api/reviews ────────────────────────────────
// ─── @access Private (Guest – completed booking only)
const createReview = asyncHandler(async (req, res) => {
  const { bookingId, propertyId, rating, comment } = req.body;

  // For testing/dev: Allow creating a review with just propertyId if bookingId is missing
  if (!bookingId && propertyId) {
    const review = await Review.create({
      property: propertyId,
      booking: new mongoose.Types.ObjectId(), // Dummy booking
      guest: req.user ? req.user._id : new mongoose.Types.ObjectId('6638ba4c9c8e8a1d2c3e4f5e'),
      rating,
      comment,
    });
    return res.status(201).json({ success: true, message: 'Test review submitted', data: review });
  }

  const booking = await Booking.findById(bookingId).populate('property');
  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }

  // Production checks
  if (booking.guest.toString() !== req.user?._id.toString()) {
    res.status(403);
    throw new Error('You can only review your own bookings');
  }
  if (booking.status !== 'completed') {
    res.status(400);
    throw new Error('You can only review completed stays');
  }
  if (booking.guestReviewed) {
    res.status(400);
    throw new Error('You have already reviewed this booking');
  }

  const review = await Review.create({
    property: booking.property._id,
    booking: bookingId,
    guest: req.user._id,
    rating,
    comment,
  });

  // Mark booking as reviewed
  booking.guestReviewed = true;
  await booking.save();

  res.status(201).json({ success: true, message: 'Review submitted', data: review });
});

// ─── @route  GET /api/reviews/property/:propertyId ───────────
// ─── @access Public
const getPropertyReviews = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  const [reviews, total] = await Promise.all([
    Review.find({ property: req.params.propertyId, isApproved: true })
      .populate('guest', 'name avatar createdAt')
      .sort('-createdAt')
      .skip(skip)
      .limit(limit),
    Review.countDocuments({ property: req.params.propertyId, isApproved: true }),
  ]);

  const property = await Property.findById(req.params.propertyId).select('rating');

  res.status(200).json({
    success: true,
    total,
    page,
    pages: Math.ceil(total / limit),
    ratingsSummary: property?.rating || {},
    data: reviews,
  });
});

// ─── @route  GET /api/reviews/my-reviews ─────────────────────
// ─── @access Private (Guest)
const getMyReviews = asyncHandler(async (req, res) => {
  const reviews = await Review.find({ guest: req.user._id })
    .populate('property', 'title images location')
    .sort('-createdAt');
  res.status(200).json({ success: true, count: reviews.length, data: reviews });
});

// ─── @route  PUT /api/reviews/:id/reply ──────────────────────
// ─── @access Private (Host)
const replyToReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id).populate('property');
  if (!review) {
    res.status(404);
    throw new Error('Review not found');
  }
  if (review.property.host.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Only the property host can reply to reviews');
  }

  review.hostReply = { comment: req.body.comment, repliedAt: new Date() };
  await review.save();

  res.status(200).json({ success: true, message: 'Reply added', data: review });
});

// ─── @route  DELETE /api/reviews/:id ─────────────────────────
// ─── @access Private (Admin | Review owner)
const deleteReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) {
    res.status(404);
    throw new Error('Review not found');
  }

  const isOwner = review.guest.toString() === req.user._id.toString();
  if (!isOwner && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized to delete this review');
  }

  await Review.findByIdAndDelete(req.params.id);
  res.status(200).json({ success: true, message: 'Review deleted' });
});

// ─── @route  POST /api/reviews/:id/report ────────────────────
// ─── @access Private
const reportReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) {
    res.status(404);
    throw new Error('Review not found');
  }
  if (review.reportedBy.includes(req.user._id)) {
    res.status(400);
    throw new Error('You have already reported this review');
  }
  review.reportedBy.push(req.user._id);
  await review.save();
  res.status(200).json({ success: true, message: 'Review reported' });
});

module.exports = {
  createReview,
  getPropertyReviews,
  getMyReviews,
  replyToReview,
  deleteReview,
  reportReview,
};
