// ============================================================
//  Razorpay Helper – utils/razorpay.js
// ============================================================

const Razorpay = require('razorpay');
const crypto = require('crypto');

// ─── Initialize Razorpay instance ────────────────────────────
const getRazorpayInstance = () => {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw new Error('Razorpay credentials missing in environment variables');
  }
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
};

/**
 * Create a Razorpay order
 * @param {Number} amount       - Amount in paise (INR × 100)
 * @param {String} receipt      - Unique receipt string (booking confirmationCode)
 * @param {Object} notes        - Metadata notes object
 * @returns {Object}            - Razorpay order object
 */
const createRazorpayOrder = async (amount, receipt, notes = {}) => {
  const instance = getRazorpayInstance();
  const order = await instance.orders.create({
    amount: Math.round(amount * 100), // convert to paise
    currency: 'INR',
    receipt,
    notes,
    payment_capture: 1, // Auto-capture
  });
  return order;
};

/**
 * Verify Razorpay payment signature (HMAC SHA256)
 * @param {String} orderId     - razorpay_order_id from client
 * @param {String} paymentId   - razorpay_payment_id from client
 * @param {String} signature   - razorpay_signature from client
 * @returns {Boolean}          - true if valid
 */
const verifyRazorpaySignature = (orderId, paymentId, signature) => {
  const body = `${orderId}|${paymentId}`;
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest('hex');
  return expectedSignature === signature;
};

/**
 * Fetch payment details from Razorpay
 * @param {String} paymentId - Razorpay payment ID
 */
const fetchPaymentDetails = async (paymentId) => {
  const instance = getRazorpayInstance();
  return await instance.payments.fetch(paymentId);
};

/**
 * Initiate a refund
 * @param {String} paymentId - Razorpay payment ID
 * @param {Number} amount    - Amount in paise (optional, full refund if omitted)
 */
const initiateRefund = async (paymentId, amount) => {
  const instance = getRazorpayInstance();
  const refundData = amount ? { amount: Math.round(amount * 100) } : {};
  return await instance.payments.refund(paymentId, refundData);
};

module.exports = {
  createRazorpayOrder,
  verifyRazorpaySignature,
  fetchPaymentDetails,
  initiateRefund,
};
