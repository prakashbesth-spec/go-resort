// ============================================================
//  Auth Middleware – middleware/authMiddleware.js
//  JWT verification + Role-based access control
// ============================================================

const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const User = require('../models/User');

// ─── Protect: Verify JWT token ────────────────────────────────
const protect = asyncHandler(async (req, res, next) => {
  let token;

  // 1) Read from Authorization header
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  // 2) Fallback: Read from httpOnly cookie
  if (!token && req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    res.status(401);
    throw new Error('Not authorized – no token provided');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      res.status(401);
      throw new Error('User belonging to this token no longer exists');
    }

    if (!user.isActive) {
      res.status(401);
      throw new Error('Your account has been deactivated. Contact support.');
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      res.status(401);
      throw new Error('Invalid token');
    }
    if (error.name === 'TokenExpiredError') {
      res.status(401);
      throw new Error('Token has expired. Please log in again.');
    }
    throw error;
  }
});

// ─── Authorize: Role-based access control ────────────────────
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      res.status(401);
      throw new Error('Not authorized');
    }
    if (!roles.includes(req.user.role)) {
      res.status(403);
      throw new Error(
        `Role '${req.user.role}' is not authorized to access this route`
      );
    }
    next();
  };
};

// ─── Optional Auth: Attach user if token present, else continue
const optionalAuth = asyncHandler(async (req, res, next) => {
  let token;
  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies?.token) {
    token = req.cookies.token;
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');
    } catch {
      req.user = null;
    }
  }
  next();
});

module.exports = { protect, authorize, optionalAuth };
