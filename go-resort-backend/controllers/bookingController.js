// ============================================================
//  Booking Controller – controllers/bookingController.js
// ============================================================

const asyncHandler = require('express-async-handler');
const Booking = require('../models/Booking');
const Property = require('../models/Property');
const {
  sendBookingConfirmationEmail,
  sendNewBookingNotificationToHost,
  sendCancellationEmail,
} = require('../utils/sendEmail');

// ─── Helper: Block property calendar dates ───────────────────
const blockPropertyDates = async (propertyId, checkIn, checkOut, bookingId) => {
  await Property.findByIdAndUpdate(propertyId, {
    $push: {
      availability: {
        startDate: checkIn,
        endDate: checkOut,
        isBlocked: true,
        reason: 'booked',
      },
    },
  });
};

// ─── @route  POST /api/bookings ───────────────────────────────
// ─── @access Private (Guest)
const createBooking = asyncHandler(async (req, res) => {
  const { propertyId, checkIn, checkOut, guests, specialRequests } = req.body;

  const property = await Property.findById(propertyId).populate('host', 'name email');
  if (!property || !property.isApproved || !property.isActive) {
    res.status(404);
    throw new Error('Property not found or unavailable');
  }

  // Prevent host from booking own property
  if (property.host._id.toString() === req.user._id.toString()) {
    res.status(400);
    throw new Error('You cannot book your own property');
  }

  // Check guest count
  const totalGuests = (guests.adults || 1) + (guests.children || 0);
  if (totalGuests > property.maxGuests) {
    res.status(400);
    throw new Error(`Max ${property.maxGuests} guests allowed for this property`);
  }

  // Check availability
  if (!property.isAvailable(checkIn, checkOut)) {
    res.status(400);
    throw new Error('Property is not available for the selected dates');
  }

  // Check for existing confirmed/pending bookings overlapping these dates
  const overlapping = await Booking.findOne({
    property: propertyId,
    status: { $in: ['pending', 'confirmed'] },
    $or: [
      { checkIn: { $lt: new Date(checkOut), $gte: new Date(checkIn) } },
      { checkOut: { $gt: new Date(checkIn), $lte: new Date(checkOut) } },
      { checkIn: { $lte: new Date(checkIn) }, checkOut: { $gte: new Date(checkOut) } },
    ],
  });

  if (overlapping) {
    res.status(400);
    throw new Error('These dates are already booked. Please choose different dates.');
  }

  const booking = await Booking.create({
    property: propertyId,
    guest: req.user._id,
    host: property.host._id,
    checkIn,
    checkOut,
    guests,
    specialRequests,
    pricing: {
      pricePerNight: property.pricePerNight,
      cleaningFee: property.cleaningFee || 0,
      serviceFee: property.serviceFee || 0,
      currency: property.currency || 'INR',
    },
  });

  // Send emails (non-blocking)
  const populatedBooking = await Booking.findById(booking._id)
    .populate('property', 'title')
    .populate('guest', 'name email');

  sendBookingConfirmationEmail(populatedBooking, populatedBooking.guest, populatedBooking.property)
    .catch((e) => console.error('Booking email error:', e.message));
  sendNewBookingNotificationToHost(populatedBooking, property.host, populatedBooking.property, populatedBooking.guest)
    .catch((e) => console.error('Host notification email error:', e.message));

  res.status(201).json({
    success: true,
    message: 'Booking created successfully',
    data: booking,
  });
});

// ─── @route  GET /api/bookings/my-bookings ───────────────────
// ─── @access Private (Guest)
const getMyBookings = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 10 } = req.query;
  const filter = { guest: req.user._id };
  if (status) filter.status = status;

  const skip = (page - 1) * limit;
  const [bookings, total] = await Promise.all([
    Booking.find(filter)
      .populate('property', 'title images location pricePerNight category')
      .populate('host', 'name avatar')
      .sort('-createdAt')
      .skip(skip)
      .limit(Number(limit)),
    Booking.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    total,
    page: Number(page),
    pages: Math.ceil(total / limit),
    data: bookings,
  });
});

// ─── @route  GET /api/bookings/host-bookings ─────────────────
// ─── @access Private (Host)
const getHostBookings = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 10 } = req.query;
  const filter = { host: req.user._id };
  if (status) filter.status = status;

  const skip = (page - 1) * limit;
  const [bookings, total] = await Promise.all([
    Booking.find(filter)
      .populate('property', 'title images location')
      .populate('guest', 'name email avatar phone')
      .sort('-createdAt')
      .skip(skip)
      .limit(Number(limit)),
    Booking.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    total,
    page: Number(page),
    pages: Math.ceil(total / limit),
    data: bookings,
  });
});

// ─── @route  GET /api/bookings/:id ───────────────────────────
// ─── @access Private
const getBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id)
    .populate('property', 'title images location amenities checkInTime checkOutTime houseRules')
    .populate('guest', 'name email avatar phone')
    .populate('host', 'name email avatar phone');

  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }

  // Only guest, host, or admin can view
  const isGuest = booking.guest._id.toString() === req.user._id.toString();
  const isHost = booking.host._id.toString() === req.user._id.toString();
  if (!isGuest && !isHost && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized to view this booking');
  }

  res.status(200).json({ success: true, data: booking });
});

// ─── @route  PUT /api/bookings/:id/cancel ────────────────────
// ─── @access Private (Guest | Host | Admin)
const cancelBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id)
    .populate('property', 'title')
    .populate('guest', 'name email')
    .populate('host', 'name email');

  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }

  const isGuest = booking.guest._id.toString() === req.user._id.toString();
  const isHost = booking.host._id.toString() === req.user._id.toString();
  if (!isGuest && !isHost && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized to cancel this booking');
  }

  if (['cancelled', 'completed'].includes(booking.status)) {
    res.status(400);
    throw new Error(`Booking is already ${booking.status}`);
  }

  booking.status = 'cancelled';
  booking.cancellationReason = req.body.reason || 'No reason provided';
  booking.cancelledAt = new Date();
  booking.cancelledBy = req.user._id;
  await booking.save();

  // Send cancellation email
  sendCancellationEmail(booking, booking.guest, booking.property)
    .catch((e) => console.error('Cancellation email error:', e.message));

  res.status(200).json({ success: true, message: 'Booking cancelled', data: booking });
});

// ─── @route  PUT /api/bookings/:id/confirm ───────────────────
// ─── @access Private (Host)
const confirmBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }
  if (booking.host.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized');
  }
  if (booking.status !== 'pending') {
    res.status(400);
    throw new Error('Only pending bookings can be confirmed');
  }

  booking.status = 'confirmed';
  await booking.save();

  // Block calendar dates
  await blockPropertyDates(booking.property, booking.checkIn, booking.checkOut, booking._id);

  res.status(200).json({ success: true, message: 'Booking confirmed', data: booking });
});

// ─── @route  PUT /api/bookings/:id/complete ──────────────────
// ─── @access Private (Host | Admin)
const completeBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }

  const isHost = booking.host.toString() === req.user._id.toString();
  if (!isHost && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized');
  }

  if (booking.status !== 'confirmed') {
    res.status(400);
    throw new Error('Only confirmed bookings can be marked as completed');
  }

  booking.status = 'completed';
  await booking.save();

  res.status(200).json({ success: true, message: 'Booking marked as completed', data: booking });
});

module.exports = {
  createBooking,
  getMyBookings,
  getHostBookings,
  getBooking,
  cancelBooking,
  confirmBooking,
  completeBooking,
};
