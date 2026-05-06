// ============================================================
//  Wishlist Controller – controllers/wishlistController.js
// ============================================================

const asyncHandler = require('express-async-handler');
const Wishlist = require('../models/Wishlist');
const Property = require('../models/Property');

// ─── @route  GET /api/wishlist ────────────────────────────────
// ─── @access Private
const getWishlist = asyncHandler(async (req, res) => {
  let wishlist = await Wishlist.findOne({ user: req.user._id }).populate({
    path: 'properties.property',
    select: 'title images location pricePerNight category rating isApproved isActive',
    match: { isApproved: true, isActive: true },
  });

  if (!wishlist) {
    wishlist = { properties: [] };
  }

  // Filter out nulls (deleted/unapproved properties)
  const filtered = (wishlist.properties || []).filter((p) => p.property !== null);

  res.status(200).json({ success: true, count: filtered.length, data: filtered });
});

// ─── @route  POST /api/wishlist/:propertyId ──────────────────
// ─── @access Private
const addToWishlist = asyncHandler(async (req, res) => {
  const property = await Property.findById(req.params.propertyId);
  if (!property || !property.isApproved) {
    res.status(404);
    throw new Error('Property not found');
  }

  let wishlist = await Wishlist.findOne({ user: req.user._id });

  if (!wishlist) {
    wishlist = await Wishlist.create({
      user: req.user._id,
      properties: [{ property: req.params.propertyId }],
    });
  } else {
    const alreadySaved = wishlist.properties.some(
      (p) => p.property.toString() === req.params.propertyId
    );
    if (alreadySaved) {
      return res.status(400).json({ success: false, message: 'Property already in wishlist' });
    }
    wishlist.properties.push({ property: req.params.propertyId });
    await wishlist.save();
  }

  res.status(200).json({ success: true, message: 'Added to wishlist' });
});

// ─── @route  DELETE /api/wishlist/:propertyId ────────────────
// ─── @access Private
const removeFromWishlist = asyncHandler(async (req, res) => {
  const wishlist = await Wishlist.findOne({ user: req.user._id });
  if (!wishlist) {
    res.status(404);
    throw new Error('Wishlist not found');
  }

  wishlist.properties = wishlist.properties.filter(
    (p) => p.property.toString() !== req.params.propertyId
  );
  await wishlist.save();

  res.status(200).json({ success: true, message: 'Removed from wishlist' });
});

// ─── @route  GET /api/wishlist/check/:propertyId ─────────────
// ─── @access Private
const checkWishlist = asyncHandler(async (req, res) => {
  const wishlist = await Wishlist.findOne({ user: req.user._id });
  const isSaved = wishlist
    ? wishlist.properties.some((p) => p.property.toString() === req.params.propertyId)
    : false;

  res.status(200).json({ success: true, isSaved });
});

module.exports = { getWishlist, addToWishlist, removeFromWishlist, checkWishlist };
