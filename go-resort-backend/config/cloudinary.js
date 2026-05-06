// ============================================================
//  Cloudinary Configuration – config/cloudinary.js
// ============================================================

const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ─── Property Images Storage ──────────────────────────────────
const propertyStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'go-resort/properties',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 1200, height: 800, crop: 'fill', quality: 'auto' }],
  },
});

// ─── Avatar / Profile Storage ─────────────────────────────────
const avatarStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'go-resort/avatars',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 300, height: 300, crop: 'fill', quality: 'auto' }],
  },
});

// ─── Blog Cover Image Storage ─────────────────────────────────
const blogStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'go-resort/blogs',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 1200, height: 630, crop: 'fill', quality: 'auto' }],
  },
});

module.exports = { cloudinary, propertyStorage, avatarStorage, blogStorage };
