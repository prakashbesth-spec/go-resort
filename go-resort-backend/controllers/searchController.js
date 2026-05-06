// ============================================================
//  Search Controller – controllers/searchController.js
// ============================================================

const asyncHandler = require('express-async-handler');
const Property = require('../models/Property');

// ─── @route  GET /api/search ──────────────────────────────────
// ─── @access Public
const searchProperties = asyncHandler(async (req, res) => {
  const {
    destination,
    checkIn,
    checkOut,
    guests,
    category,
    minPrice,
    maxPrice,
    amenities,
    sort = '-rating.average',
    page = 1,
    limit = 12,
  } = req.query;

  // ── Build filter ─────────────────────────────────────────────
  const filter = { isApproved: true, isActive: true };

  // Destination (city/country/address text search)
  if (destination) {
    filter.$or = [
      { 'location.city': { $regex: destination, $options: 'i' } },
      { 'location.country': { $regex: destination, $options: 'i' } },
      { 'location.state': { $regex: destination, $options: 'i' } },
      { destination: { $regex: destination, $options: 'i' } },
      { title: { $regex: destination, $options: 'i' } },
    ];
  }

  // Category filter
  if (category) filter.category = category;

  // Guest capacity
  if (guests) filter.maxGuests = { $gte: parseInt(guests, 10) };

  // Price range
  if (minPrice || maxPrice) {
    filter.pricePerNight = {};
    if (minPrice) filter.pricePerNight.$gte = parseFloat(minPrice);
    if (maxPrice) filter.pricePerNight.$lte = parseFloat(maxPrice);
  }

  // Amenities filter
  if (amenities) {
    const amenityList = amenities.split(',').map((a) => a.trim());
    filter.amenities = { $all: amenityList };
  }

  // ── Date availability filter ─────────────────────────────────
  if (checkIn && checkOut) {
    const cIn = new Date(checkIn);
    const cOut = new Date(checkOut);

    // Exclude properties that have a blocked availability overlapping requested dates
    filter['availability'] = {
      $not: {
        $elemMatch: {
          isBlocked: true,
          startDate: { $lt: cOut },
          endDate: { $gt: cIn },
        },
      },
    };
  }

  // ── Execute query ────────────────────────────────────────────
  const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

  const [properties, total] = await Promise.all([
    Property.find(filter)
      .populate('host', 'name avatar hostInfo.isSuperhost')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit, 10)),
    Property.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    query: { destination, checkIn, checkOut, guests, category, minPrice, maxPrice },
    total,
    page: parseInt(page, 10),
    pages: Math.ceil(total / parseInt(limit, 10)),
    data: properties,
  });
});

// ─── @route  GET /api/search/destinations ────────────────────
// ─── @access Public
const getDestinations = asyncHandler(async (req, res) => {
  const destinations = await Property.aggregate([
    { $match: { isApproved: true, isActive: true } },
    {
      $group: {
        _id: '$location.city',
        country: { $first: '$location.country' },
        state: { $first: '$location.state' },
        count: { $sum: 1 },
        thumbnail: { $first: { $arrayElemAt: ['$images.url', 0] } },
        avgPrice: { $avg: '$pricePerNight' },
        avgRating: { $avg: '$rating.average' },
      },
    },
    { $sort: { count: -1 } },
    { $limit: 20 },
  ]);

  res.status(200).json({ success: true, count: destinations.length, data: destinations });
});

// ─── @route  GET /api/search/suggestions ─────────────────────
// ─── @access Public (for search autocomplete)
const getSearchSuggestions = asyncHandler(async (req, res) => {
  const { q } = req.query;
  if (!q || q.length < 2) {
    return res.status(200).json({ success: true, data: [] });
  }

  const regex = { $regex: q, $options: 'i' };

  const properties = await Property.find({
    isApproved: true,
    isActive: true,
    $or: [
      { 'location.city': regex },
      { 'location.country': regex },
      { title: regex },
      { destination: regex },
    ],
  })
    .select('title location.city location.country category images')
    .limit(8);

  const suggestions = properties.map((p) => ({
    type: 'property',
    id: p._id,
    label: p.title,
    subLabel: `${p.location.city}, ${p.location.country}`,
    category: p.category,
    thumbnail: p.images?.[0]?.url || null,
  }));

  // Add unique city suggestions
  const citySet = new Set(properties.map((p) => p.location.city));
  const citySuggestions = [...citySet].map((city) => ({
    type: 'destination',
    label: city,
    subLabel: 'Destination',
  }));

  res.status(200).json({
    success: true,
    data: [...citySuggestions, ...suggestions].slice(0, 10),
  });
});

// ─── @route  GET /api/search/categories ──────────────────────
// ─── @access Public
const getCategoryStats = asyncHandler(async (req, res) => {
  const stats = await Property.aggregate([
    { $match: { isApproved: true, isActive: true } },
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 },
        avgPrice: { $avg: '$pricePerNight' },
        avgRating: { $avg: '$rating.average' },
      },
    },
    { $sort: { count: -1 } },
  ]);

  res.status(200).json({ success: true, data: stats });
});

module.exports = {
  searchProperties,
  getDestinations,
  getSearchSuggestions,
  getCategoryStats,
};
