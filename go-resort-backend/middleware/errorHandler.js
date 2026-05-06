// ============================================================
//  Global Error Handler – middleware/errorHandler.js
// ============================================================

const errorHandler = (err, req, res, next) => {
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  let message = err.message || 'Internal Server Error';
  let errors = null;

  // ── Mongoose: CastError (invalid ObjectId) ────────────────
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid ${err.path}: ${err.value}`;
  }

  // ── Mongoose: Duplicate key ───────────────────────────────
  if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyValue)[0];
    message = `Duplicate value for field '${field}'. Please use another value.`;
  }

  // ── Mongoose: Validation error ────────────────────────────
  if (err.name === 'ValidationError') {
    statusCode = 400;
    errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    message = 'Validation failed';
  }

  // ── JWT errors ────────────────────────────────────────────
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token. Please log in again.';
  }
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired. Please log in again.';
  }

  // ── CORS error ────────────────────────────────────────────
  if (err.message === 'Not allowed by CORS') {
    statusCode = 403;
    message = 'CORS policy: Origin not allowed.';
  }

  const response = {
    success: false,
    message,
    ...(errors && { errors }),
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      originalError: err.message,
    }),
  };

  res.status(statusCode).json(response);
};

module.exports = errorHandler;
