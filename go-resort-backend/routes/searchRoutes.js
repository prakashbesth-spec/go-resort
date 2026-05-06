// ============================================================
//  Search Routes – routes/searchRoutes.js
// ============================================================

const express = require('express');
const router = express.Router();
const {
  searchProperties,
  getDestinations,
  getSearchSuggestions,
  getCategoryStats,
} = require('../controllers/searchController');
const { searchValidator } = require('../middleware/validate');

router.get('/', searchValidator, searchProperties);
router.get('/destinations', getDestinations);
router.get('/suggestions', getSearchSuggestions);
router.get('/categories', getCategoryStats);

module.exports = router;
