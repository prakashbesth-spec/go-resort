// ============================================================
//  Property Model – models/Property.js
// ============================================================

const mongoose = require('mongoose');

const CATEGORIES = [
  'Villa', 'Mansion', 'Cabin', 'Cottage', 'Glamping',
  'Pool', 'Hot Tub', 'Fire Pit', 'Game Room', 'Chef Kitchen',
];

const AMENITIES = [
  'WiFi', 'Air Conditioning', 'Heating', 'Kitchen', 'Washer',
  'Dryer', 'Free Parking', 'Pool', 'Hot Tub', 'BBQ Grill',
  'Fire Pit', 'Game Room', 'Chef Kitchen', 'Gym', 'TV',
  'Pet Friendly', 'Smoking Allowed', 'Elevator', 'Beachfront',
  'Mountain View', 'Lake View', 'City View',
];

// ─── Availability Block Sub-schema ────────────────────────────
const availabilitySchema = new mongoose.Schema(
  {
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    isBlocked: { type: Boolean, default: false }, // true = unavailable
    reason: { type: String, enum: ['booked', 'owner-block', 'maintenance'] },
  },
  { _id: false }
);

// ─── Review Summary Sub-schema ────────────────────────────────
const ratingSchema = new mongoose.Schema(
  {
    average: { type: Number, default: 0, min: 0, max: 5 },
    count: { type: Number, default: 0 },
    cleanliness: { type: Number, default: 0 },
    accuracy: { type: Number, default: 0 },
    communication: { type: Number, default: 0 },
    location: { type: Number, default: 0 },
    checkIn: { type: Number, default: 0 },
    value: { type: Number, default: 0 },
  },
  { _id: false }
);

const propertySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Property title is required'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    description: {
      type: String,
      required: [true, 'Property description is required'],
      maxlength: [3000, 'Description cannot exceed 3000 characters'],
    },
    category: {
      type: String,
      required: [true, 'Property category is required'],
      enum: { values: CATEGORIES, message: `Category must be one of: ${CATEGORIES.join(', ')}` },
    },
    host: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    location: {
      address: { type: String, required: [true, 'Address is required'] },
      city: { type: String, required: [true, 'City is required'] },
      state: { type: String },
      country: { type: String, required: [true, 'Country is required'], default: 'India' },
      zipCode: String,
      // GeoJSON for location-based queries
      coordinates: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], default: [0, 0] }, // [lng, lat]
      },
    },
    images: [
      {
        public_id: { type: String, required: true },
        url: { type: String, required: true },
        caption: String,
      },
    ],
    pricePerNight: {
      type: Number,
      required: [true, 'Price per night is required'],
      min: [1, 'Price must be at least 1'],
    },
    currency: { type: String, default: 'INR' },
    cleaningFee: { type: Number, default: 0 },
    serviceFee: { type: Number, default: 0 },

    // Capacity
    maxGuests: { type: Number, required: [true, 'Max guests is required'], min: 1 },
    bedrooms: { type: Number, default: 1, min: 0 },
    bathrooms: { type: Number, default: 1, min: 0 },
    beds: { type: Number, default: 1, min: 0 },

    amenities: {
      type: [String],
      validate: {
        validator: function (arr) {
          return arr.every((a) => AMENITIES.includes(a));
        },
        message: 'One or more amenities are invalid',
      },
    },

    // Policies
    houseRules: { type: String, maxlength: 1000 },
    checkInTime: { type: String, default: '15:00' },
    checkOutTime: { type: String, default: '11:00' },
    cancellationPolicy: {
      type: String,
      enum: ['flexible', 'moderate', 'strict', 'super-strict'],
      default: 'moderate',
    },

    // Calendar
    availability: [availabilitySchema],
    minNights: { type: Number, default: 1 },
    maxNights: { type: Number, default: 30 },

    // Status & Features
    isApproved: { type: Boolean, default: false },
    isFeatured: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },

    // Ratings
    rating: ratingSchema,

    // SEO slug
    slug: { type: String, unique: true, sparse: true },

    // Destination tag for search
    destination: { type: String, index: true },

    // View count
    viewCount: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Indexes ──────────────────────────────────────────────────
propertySchema.index({ 'location.coordinates': '2dsphere' });
propertySchema.index({ category: 1, isApproved: 1, isActive: 1 });
propertySchema.index({ pricePerNight: 1 });
propertySchema.index({ title: 'text', description: 'text', 'location.city': 'text' });

// ─── Virtual: Reviews ─────────────────────────────────────────
propertySchema.virtual('reviews', {
  ref: 'Review',
  localField: '_id',
  foreignField: 'property',
});

// ─── Pre-save: Auto-generate slug ─────────────────────────────
propertySchema.pre('save', function (next) {
  if (this.isModified('title')) {
    this.slug =
      this.title.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-') +
      '-' +
      this._id.toString().slice(-6);
  }
  if (!this.destination) {
    this.destination = this.location.city;
  }
  next();
});

// ─── Method: Check if dates are available ─────────────────────
propertySchema.methods.isAvailable = function (checkIn, checkOut) {
  const cIn = new Date(checkIn);
  const cOut = new Date(checkOut);

  return !this.availability.some((block) => {
    if (!block.isBlocked) return false;
    const bStart = new Date(block.startDate);
    const bEnd = new Date(block.endDate);
    return cIn < bEnd && cOut > bStart; // Overlap check
  });
};

module.exports = mongoose.model('Property', propertySchema);
