// ============================================================
//  Blog Controller – controllers/blogController.js
// ============================================================

const asyncHandler = require('express-async-handler');
const Blog = require('../models/Blog');
const APIFeatures = require('../utils/apiFeatures');
const { cloudinary } = require('../config/cloudinary');

// ─── @route  GET /api/blogs ───────────────────────────────────
// ─── @access Public
const getAllBlogs = asyncHandler(async (req, res) => {
  const baseQuery = Blog.find({ published: true }).populate('author', 'name avatar');

  const features = new APIFeatures(baseQuery, req.query)
    .search(['title', 'excerpt', 'tags'])
    .sort()
    .paginate(9);

  if (req.query.category) {
    features.query = features.query.find({ category: req.query.category });
  }

  const [blogs, total] = await Promise.all([
    features.query,
    Blog.countDocuments({ published: true }),
  ]);

  res.status(200).json({
    success: true,
    total,
    page: features.page,
    pages: Math.ceil(total / 9),
    data: blogs,
  });
});

// ─── @route  GET /api/blogs/:slug ─────────────────────────────
// ─── @access Public
const getBlog = asyncHandler(async (req, res) => {
  const blog = await Blog.findOne({
    slug: req.params.slug,
    published: true,
  }).populate('author', 'name avatar');

  if (!blog) {
    res.status(404);
    throw new Error('Blog post not found');
  }

  // Increment view count
  Blog.findByIdAndUpdate(blog._id, { $inc: { viewCount: 1 } }).catch(() => {});

  res.status(200).json({ success: true, data: blog });
});

// ─── @route  POST /api/blogs ──────────────────────────────────
// ─── @access Admin
const createBlog = asyncHandler(async (req, res) => {
  req.body.author = req.user._id;

  if (req.file) {
    req.body.coverImage = { public_id: req.file.filename, url: req.file.path };
  }

  const blog = await Blog.create(req.body);
  res.status(201).json({ success: true, message: 'Blog post created', data: blog });
});

// ─── @route  PUT /api/blogs/:id ───────────────────────────────
// ─── @access Admin
const updateBlog = asyncHandler(async (req, res) => {
  let blog = await Blog.findById(req.params.id);
  if (!blog) {
    res.status(404);
    throw new Error('Blog post not found');
  }

  if (req.file) {
    if (blog.coverImage?.public_id) {
      await cloudinary.uploader.destroy(blog.coverImage.public_id);
    }
    req.body.coverImage = { public_id: req.file.filename, url: req.file.path };
  }

  blog = await Blog.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({ success: true, message: 'Blog post updated', data: blog });
});

// ─── @route  DELETE /api/blogs/:id ───────────────────────────
// ─── @access Admin
const deleteBlog = asyncHandler(async (req, res) => {
  const blog = await Blog.findById(req.params.id);
  if (!blog) {
    res.status(404);
    throw new Error('Blog post not found');
  }

  if (blog.coverImage?.public_id) {
    await cloudinary.uploader.destroy(blog.coverImage.public_id);
  }

  await blog.deleteOne();
  res.status(200).json({ success: true, message: 'Blog post deleted' });
});

// ─── @route  GET /api/blogs/admin/all ────────────────────────
// ─── @access Admin
const getAllBlogsAdmin = asyncHandler(async (req, res) => {
  const blogs = await Blog.find()
    .populate('author', 'name')
    .sort('-createdAt')
    .limit(50);
  res.status(200).json({ success: true, count: blogs.length, data: blogs });
});

module.exports = { getAllBlogs, getBlog, createBlog, updateBlog, deleteBlog, getAllBlogsAdmin };
