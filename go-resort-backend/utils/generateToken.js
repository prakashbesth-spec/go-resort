// ============================================================
//  JWT Token Generator – utils/generateToken.js
// ============================================================

const jwt = require('jsonwebtoken');

/**
 * Generate JWT and set it as an httpOnly cookie
 * @param {Object} res  - Express response object
 * @param {String} id   - User's MongoDB _id
 * @returns {String}    - The signed JWT string
 */
const generateToken = (res, id) => {
  const token = jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });

  // Set httpOnly cookie (XSS-safe)
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // HTTPS only in prod
    sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  };

  res.cookie('token', token, cookieOptions);
  return token;
};

/**
 * Clear the auth cookie on logout
 * @param {Object} res - Express response object
 */
const clearToken = (res) => {
  res.cookie('token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
    expires: new Date(0),
  });
};

module.exports = { generateToken, clearToken };
