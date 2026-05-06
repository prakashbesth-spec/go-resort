// ============================================================
//  Property Routes – routes/propertyRoutes.js
// ============================================================

const express = require('express');
const router = express.Router();
const {
  getAllProperties,
  getFeaturedProperties,
  getProperty,
  createProperty,
  updateProperty,
  deleteProperty,
  getMyListings,
  approveProperty,
  getAvailability,
  deletePropertyImage,
} = require('../controllers/propertyController');
const { protect, authorize, optionalAuth } = require('../middleware/authMiddleware');
const { uploadPropertyImages } = require('../middleware/uploadMiddleware');
const { createPropertyValidator } = require('../middleware/validate');

// Public routes
router.get('/', getAllProperties);
router.get('/featured', getFeaturedProperties);
router.get('/:id/availability', getAvailability);
router.get('/:id', optionalAuth, getProperty);

// Host routes
router.post(
  '/',
  // protect, // Disabled for initial testing
  // authorize('host', 'admin'), // Disabled for initial testing
  uploadPropertyImages,
  createPropertyValidator,
  createProperty
);
router.put(
  '/:id',
  protect,
  authorize('host', 'admin'),
  uploadPropertyImages,
  updateProperty
);
router.delete('/:id', protect, authorize('host', 'admin'), deleteProperty);
router.get('/host/my-listings', protect, authorize('host', 'admin'), getMyListings);
router.delete(
  '/:id/images/:imageId',
  protect,
  authorize('host', 'admin'),
  deletePropertyImage
);

// Admin routes
router.put('/:id/approve', protect, authorize('admin'), approveProperty);

module.exports = router;
