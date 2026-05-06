// ============================================================
//  Upload Middleware – middleware/uploadMiddleware.js
//  Multer + Cloudinary storage
// ============================================================

const multer = require('multer');
const { propertyStorage, avatarStorage, blogStorage } = require('../config/cloudinary');

// ─── Allowed MIME types ───────────────────────────────────────
const imageFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, and WebP images are allowed'), false);
  }
};

// ─── Property images uploader (up to 10 images) ──────────────
const uploadPropertyImages = multer({
  storage: propertyStorage,
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024, files: 10 }, // 5MB per file
}).array('images', 10);

// ─── Avatar uploader (single image) ──────────────────────────
const uploadAvatar = multer({
  storage: avatarStorage,
  fileFilter: imageFilter,
  limits: { fileSize: 2 * 1024 * 1024, files: 1 }, // 2MB
}).single('avatar');

// ─── Blog cover image uploader ────────────────────────────────
const uploadBlogCover = multer({
  storage: blogStorage,
  fileFilter: imageFilter,
  limits: { fileSize: 3 * 1024 * 1024, files: 1 }, // 3MB
}).single('coverImage');

// ─── Wrap multer in a promise to use with express-async-handler
const handleUpload = (uploader) => (req, res, next) => {
  uploader(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        res.status(400);
        return next(new Error('File size too large'));
      }
      if (err.code === 'LIMIT_FILE_COUNT') {
        res.status(400);
        return next(new Error('Too many files uploaded'));
      }
      res.status(400);
      return next(new Error(err.message));
    }
    if (err) {
      res.status(400);
      return next(err);
    }
    next();
  });
};

module.exports = {
  uploadPropertyImages: handleUpload(uploadPropertyImages),
  uploadAvatar: handleUpload(uploadAvatar),
  uploadBlogCover: handleUpload(uploadBlogCover),
};
