// ============================================================
//  Review Model – models/Review.js
// ============================================================

const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
      required: [true, 'Property reference is required'],
    },
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: [true, 'Booking reference is required'],
    },
    guest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Guest reference is required'],
    },

    // Ratings (1-5)
    rating: {
      overall: {
        type: Number,
        required: [true, 'Overall rating is required'],
        min: [1, 'Rating must be at least 1'],
        max: [5, 'Rating cannot exceed 5'],
      },
      cleanliness: { type: Number, min: 1, max: 5 },
      accuracy: { type: Number, min: 1, max: 5 },
      communication: { type: Number, min: 1, max: 5 },
      location: { type: Number, min: 1, max: 5 },
      checkIn: { type: Number, min: 1, max: 5 },
      value: { type: Number, min: 1, max: 5 },
    },

    comment: {
      type: String,
      required: [true, 'Review comment is required'],
      minlength: [10, 'Review must be at least 10 characters'],
      maxlength: [1000, 'Review cannot exceed 1000 characters'],
    },

    // Host's reply
    hostReply: {
      comment: String,
      repliedAt: Date,
    },

    // Moderation
    isApproved: { type: Boolean, default: true },
    reportedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── One review per booking ───────────────────────────────────
reviewSchema.index({ booking: 1 }, { unique: true });
reviewSchema.index({ property: 1, createdAt: -1 });
reviewSchema.index({ guest: 1 });

// ─── Static: Recalculate property rating after save/delete ────
reviewSchema.statics.calcAverageRating = async function (propertyId) {
  const stats = await this.aggregate([
    { $match: { property: propertyId, isApproved: true } },
    {
      $group: {
        _id: '$property',
        avgOverall: { $avg: '$rating.overall' },
        avgCleanliness: { $avg: '$rating.cleanliness' },
        avgAccuracy: { $avg: '$rating.accuracy' },
        avgCommunication: { $avg: '$rating.communication' },
        avgLocation: { $avg: '$rating.location' },
        avgCheckIn: { $avg: '$rating.checkIn' },
        avgValue: { $avg: '$rating.value' },
        count: { $sum: 1 },
      },
    },
  ]);

  const Property = require('./Property');
  if (stats.length > 0) {
    await Property.findByIdAndUpdate(propertyId, {
      'rating.average': Math.round(stats[0].avgOverall * 10) / 10,
      'rating.count': stats[0].count,
      'rating.cleanliness': Math.round((stats[0].avgCleanliness || 0) * 10) / 10,
      'rating.accuracy': Math.round((stats[0].avgAccuracy || 0) * 10) / 10,
      'rating.communication': Math.round((stats[0].avgCommunication || 0) * 10) / 10,
      'rating.location': Math.round((stats[0].avgLocation || 0) * 10) / 10,
      'rating.checkIn': Math.round((stats[0].avgCheckIn || 0) * 10) / 10,
      'rating.value': Math.round((stats[0].avgValue || 0) * 10) / 10,
    });
  } else {
    await Property.findByIdAndUpdate(propertyId, {
      'rating.average': 0,
      'rating.count': 0,
    });
  }
};

// Recalculate after review save
reviewSchema.post('save', function () {
  this.constructor.calcAverageRating(this.property);
});

// Recalculate after review delete
reviewSchema.post('findOneAndDelete', function (doc) {
  if (doc) doc.constructor.calcAverageRating(doc.property);
});

module.exports = mongoose.model('Review', reviewSchema);
