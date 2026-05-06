// ============================================================
//  Blog Model – models/Blog.js
// ============================================================

const mongoose = require('mongoose');
const slugify = require('slugify');

const BLOG_CATEGORIES = [
  'Travel Tips', 'Destinations', 'Experiences', 'Events',
  'Host Spotlight', 'Property Guides', 'News', 'Seasonal',
];

const blogSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Blog title is required'],
      trim: true,
      maxlength: [150, 'Title cannot exceed 150 characters'],
    },
    slug: {
      type: String,
      unique: true,
    },
    content: {
      type: String,
      required: [true, 'Blog content is required'],
    },
    excerpt: {
      type: String,
      required: [true, 'Blog excerpt is required'],
      maxlength: [300, 'Excerpt cannot exceed 300 characters'],
    },
    category: {
      type: String,
      enum: {
        values: BLOG_CATEGORIES,
        message: `Category must be one of: ${BLOG_CATEGORIES.join(', ')}`,
      },
      required: [true, 'Blog category is required'],
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    coverImage: {
      public_id: String,
      url: {
        type: String,
        default: 'https://res.cloudinary.com/demo/image/upload/v1/go-resort/blogs/default-blog',
      },
    },
    tags: [{ type: String, trim: true, maxlength: 30 }],
    published: { type: Boolean, default: false },
    publishedAt: Date,

    // SEO
    metaTitle: { type: String, maxlength: 60 },
    metaDescription: { type: String, maxlength: 160 },

    // Analytics
    viewCount: { type: Number, default: 0 },
    readTime: { type: Number, default: 3 }, // minutes
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Indexes ──────────────────────────────────────────────────
blogSchema.index({ published: 1, publishedAt: -1 });
blogSchema.index({ category: 1, published: 1 });
blogSchema.index({ title: 'text', excerpt: 'text', tags: 'text' });

// ─── Pre-save: Generate slug and calculate read time ──────────
blogSchema.pre('save', function (next) {
  if (this.isModified('title')) {
    this.slug = slugify(this.title, { lower: true, strict: true }) +
      '-' + this._id.toString().slice(-5);
  }

  if (this.isModified('content')) {
    // ~200 words/min reading speed
    const wordCount = this.content.trim().split(/\s+/).length;
    this.readTime = Math.max(1, Math.ceil(wordCount / 200));
  }

  if (this.isModified('published') && this.published && !this.publishedAt) {
    this.publishedAt = new Date();
  }

  next();
});

module.exports = mongoose.model('Blog', blogSchema);
