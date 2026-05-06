// ============================================================
//  Wishlist Routes – routes/wishlistRoutes.js
// ============================================================

const express = require('express');
const router = express.Router();
const {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  checkWishlist,
} = require('../controllers/wishlistController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, getWishlist);
router.get('/check/:propertyId', protect, checkWishlist);
router.post('/:propertyId', protect, addToWishlist);
router.delete('/:propertyId', protect, removeFromWishlist);

module.exports = router;
