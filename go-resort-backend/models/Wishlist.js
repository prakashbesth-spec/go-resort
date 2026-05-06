// ============================================================
//  Wishlist Model – models/Wishlist.js
// ============================================================

const mongoose = require('mongoose');

const wishlistSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    properties: [
      {
        property: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Property',
        },
        addedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);


module.exports = mongoose.model('Wishlist', wishlistSchema);
