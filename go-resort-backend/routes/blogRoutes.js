// ============================================================
//  Blog Routes – routes/blogRoutes.js
// ============================================================

const express = require('express');
const router = express.Router();
const {
  getAllBlogs,
  getBlog,
  createBlog,
  updateBlog,
  deleteBlog,
  getAllBlogsAdmin,
} = require('../controllers/blogController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { uploadBlogCover } = require('../middleware/uploadMiddleware');
const { createBlogValidator } = require('../middleware/validate');

// Public
router.get('/', getAllBlogs);
router.get('/admin/all', protect, authorize('admin'), getAllBlogsAdmin);
router.get('/:slug', getBlog);

// Admin CRUD
router.post('/', protect, authorize('admin'), uploadBlogCover, createBlogValidator, createBlog);
router.put('/:id', protect, authorize('admin'), uploadBlogCover, updateBlog);
router.delete('/:id', protect, authorize('admin'), deleteBlog);

module.exports = router;
