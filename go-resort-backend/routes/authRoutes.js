// ============================================================
//  Auth Routes – routes/authRoutes.js
// ============================================================

const express = require('express');
const router = express.Router();
const {
  register,
  login,
  logout,
  getMe,
  forgotPassword,
  resetPassword,
  changePassword,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const {
  registerValidator,
  loginValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
} = require('../middleware/validate');

router.post('/register', registerValidator, register);
router.post('/login', loginValidator, login);
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);
router.post('/forgot-password', forgotPasswordValidator, forgotPassword);
router.put('/reset-password/:token', resetPasswordValidator, resetPassword);
router.put('/change-password', protect, changePassword);

module.exports = router;
