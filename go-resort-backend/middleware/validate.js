// ============================================================
//  Validation Middleware – middleware/validate.js
//  express-validator rule sets for each route group
// ============================================================

const { body, param, query, validationResult } = require('express-validator');

// ─── Run validation and return errors ────────────────────────
const runValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};

// ─── Auth Validators ─────────────────────────────────────────
const registerValidator = [
  body('name').trim().notEmpty().withMessage('Name is required')
    .isLength({ max: 50 }).withMessage('Name max 50 characters'),
  body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase and a number'),
  body('role').optional().isIn(['guest', 'host']).withMessage('Role must be guest or host'),
  runValidation,
];

const loginValidator = [
  body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
  runValidation,
];

const forgotPasswordValidator = [
  body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
  runValidation,
];

const resetPasswordValidator = [
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase and a number'),
  param('token').notEmpty().withMessage('Token is required'),
  runValidation,
];

// ─── Property Validators ─────────────────────────────────────
const createPropertyValidator = [
  body('title').trim().notEmpty().withMessage('Title is required')
    .isLength({ max: 100 }).withMessage('Title max 100 characters'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('category').isIn([
    'Villa','Mansion','Cabin','Cottage','Glamping',
    'Pool','Hot Tub','Fire Pit','Game Room','Chef Kitchen',
  ]).withMessage('Invalid category'),
  body('pricePerNight').isFloat({ min: 1 }).withMessage('Price must be a positive number'),
  body('maxGuests').isInt({ min: 1 }).withMessage('Max guests must be at least 1'),
  body('location.city').notEmpty().withMessage('City is required'),
  body('location.country').notEmpty().withMessage('Country is required'),
  body('location.address').notEmpty().withMessage('Address is required'),
  runValidation,
];

// ─── Booking Validators ───────────────────────────────────────
const createBookingValidator = [
  body('propertyId').isMongoId().withMessage('Valid property ID required'),
  body('checkIn').isISO8601().withMessage('Valid check-in date required')
    .custom((val) => {
      if (new Date(val) < new Date()) throw new Error('Check-in must be in the future');
      return true;
    }),
  body('checkOut').isISO8601().withMessage('Valid check-out date required')
    .custom((val, { req }) => {
      if (new Date(val) <= new Date(req.body.checkIn))
        throw new Error('Check-out must be after check-in');
      return true;
    }),
  body('guests.adults').isInt({ min: 1 }).withMessage('At least 1 adult required'),
  runValidation,
];

// ─── Review Validators ────────────────────────────────────────
const createReviewValidator = [
  body('bookingId').optional().isMongoId().withMessage('Valid booking ID required'),
  body('propertyId').optional().isMongoId().withMessage('Valid property ID required'),
  body('rating.overall').isFloat({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('comment').trim().isLength({ min: 10, max: 1000 })
    .withMessage('Comment must be 10–1000 characters'),
  runValidation,
];

// ─── Blog Validators ──────────────────────────────────────────
const createBlogValidator = [
  body('title').trim().notEmpty().withMessage('Title is required')
    .isLength({ max: 150 }).withMessage('Title max 150 characters'),
  body('content').trim().notEmpty().withMessage('Content is required'),
  body('excerpt').trim().notEmpty().withMessage('Excerpt is required')
    .isLength({ max: 300 }).withMessage('Excerpt max 300 characters'),
  body('category').notEmpty().withMessage('Category is required'),
  runValidation,
];

// ─── Search Validators ────────────────────────────────────────
const searchValidator = [
  query('checkIn').optional().isISO8601().withMessage('Invalid check-in date'),
  query('checkOut').optional().isISO8601().withMessage('Invalid check-out date'),
  query('guests').optional().isInt({ min: 1 }).withMessage('Guests must be a positive integer'),
  query('minPrice').optional().isFloat({ min: 0 }).withMessage('Min price must be non-negative'),
  query('maxPrice').optional().isFloat({ min: 0 }).withMessage('Max price must be non-negative'),
  runValidation,
];

module.exports = {
  registerValidator,
  loginValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
  createPropertyValidator,
  createBookingValidator,
  createReviewValidator,
  createBlogValidator,
  searchValidator,
  runValidation,
};
