// ============================================================
//  Review Routes – routes/reviewRoutes.js
// ============================================================

const express = require('express');
const router = express.Router();
const {
  createReview,
  getPropertyReviews,
  getMyReviews,
  replyToReview,
  deleteReview,
  reportReview,
} = require('../controllers/reviewController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { createReviewValidator } = require('../middleware/validate');

// router.post('/', protect, authorize('guest'), createReviewValidator, createReview);
router.post('/', createReviewValidator, createReview);
router.get('/my-reviews', protect, getMyReviews);
router.get('/property/:propertyId', getPropertyReviews);
router.put('/:id/reply', protect, authorize('host', 'admin'), replyToReview);
router.post('/:id/report', protect, reportReview);
router.delete('/:id', protect, deleteReview);

module.exports = router;
