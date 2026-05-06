// ============================================================
//  Email Utility – utils/sendEmail.js
//  Nodemailer + Gmail SMTP with HTML templates
// ============================================================

const nodemailer = require('nodemailer');

// ─── Transporter ─────────────────────────────────────────────
const createTransporter = () =>
  nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS, // Use Gmail App Password
    },
  });

// ─── Base HTML template ──────────────────────────────────────
const baseTemplate = (content) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 30px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
    .header { background: #22ae4c; padding: 30px; text-align: center; color: white; }
    .header h1 { margin: 0; font-size: 28px; letter-spacing: 2px; }
    .body { padding: 30px; color: #333; line-height: 1.7; }
    .btn { display: inline-block; background: #22ae4c; color: white; padding: 14px 30px; border-radius: 30px; text-decoration: none; font-weight: bold; margin: 20px 0; }
    .footer { background: #f8f8f8; padding: 20px; text-align: center; color: #999; font-size: 13px; }
    .divider { border: none; border-top: 1px solid #eee; margin: 20px 0; }
    .info-box { background: #f0fff4; border-left: 4px solid #22ae4c; padding: 15px 20px; border-radius: 4px; margin: 15px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🏖️ GO RESORT</h1>
    </div>
    <div class="body">${content}</div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} GO RESORT | HolidayKeepers Platform<br>
      This is an automated email, please do not reply.
    </div>
  </div>
</body>
</html>`;

// ─── Core sendEmail function ──────────────────────────────────
const sendEmail = async ({ to, subject, html, text }) => {
  const transporter = createTransporter();
  const mailOptions = {
    from: `"GO RESORT" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
    text: text || 'Please view this email in an HTML-capable client.',
  };

  const info = await transporter.sendMail(mailOptions);
  console.log(`📧 Email sent: ${info.messageId}`);
  return info;
};

// ─── Email Templates ──────────────────────────────────────────

/** Welcome email after registration */
const sendWelcomeEmail = (user) =>
  sendEmail({
    to: user.email,
    subject: '🏖️ Welcome to GO RESORT!',
    html: baseTemplate(`
      <h2>Hello, ${user.name}! 👋</h2>
      <p>Welcome to <strong>GO RESORT</strong> – your gateway to the finest vacation rentals in India and beyond!</p>
      <div class="info-box">Your account has been successfully created as a <strong>${user.role}</strong>.</div>
      <p>Start exploring handpicked villas, cabins, glamping sites, and more.</p>
      <a href="${process.env.FRONTEND_URL}" class="btn">Explore Properties</a>
    `),
  });

/** Password reset email */
const sendPasswordResetEmail = (user, resetUrl) =>
  sendEmail({
    to: user.email,
    subject: '🔐 Reset Your GO RESORT Password',
    html: baseTemplate(`
      <h2>Password Reset Request</h2>
      <p>Hi ${user.name}, we received a request to reset your password.</p>
      <p>Click the button below to reset it. This link expires in <strong>15 minutes</strong>.</p>
      <a href="${resetUrl}" class="btn">Reset Password</a>
      <hr class="divider">
      <p style="color:#999;font-size:13px;">If you didn't request this, please ignore this email. Your password won't change.</p>
    `),
  });

/** Booking confirmation email to guest */
const sendBookingConfirmationEmail = (booking, user, property) =>
  sendEmail({
    to: user.email,
    subject: `✅ Booking Confirmed – ${property.title}`,
    html: baseTemplate(`
      <h2>Your Booking is Confirmed! 🎉</h2>
      <p>Hi ${user.name},</p>
      <div class="info-box">
        <strong>Confirmation Code:</strong> ${booking.confirmationCode}<br>
        <strong>Property:</strong> ${property.title}<br>
        <strong>Check-In:</strong> ${new Date(booking.checkIn).toDateString()}<br>
        <strong>Check-Out:</strong> ${new Date(booking.checkOut).toDateString()}<br>
        <strong>Total Nights:</strong> ${booking.pricing.totalNights}<br>
        <strong>Total Amount:</strong> ₹${booking.pricing.totalPrice.toLocaleString()}
      </div>
      <a href="${process.env.FRONTEND_URL}/bookings/${booking._id}" class="btn">View Booking</a>
    `),
  });

/** Booking notification email to host */
const sendNewBookingNotificationToHost = (booking, host, property, guest) =>
  sendEmail({
    to: host.email,
    subject: `📅 New Booking Request – ${property.title}`,
    html: baseTemplate(`
      <h2>You Have a New Booking! 🏡</h2>
      <p>Hi ${host.name},</p>
      <p><strong>${guest.name}</strong> has booked your property.</p>
      <div class="info-box">
        <strong>Confirmation Code:</strong> ${booking.confirmationCode}<br>
        <strong>Guest:</strong> ${guest.name} (${guest.email})<br>
        <strong>Check-In:</strong> ${new Date(booking.checkIn).toDateString()}<br>
        <strong>Check-Out:</strong> ${new Date(booking.checkOut).toDateString()}<br>
        <strong>Total Nights:</strong> ${booking.pricing.totalNights}
      </div>
      <a href="${process.env.FRONTEND_URL}/host/bookings" class="btn">Manage Booking</a>
    `),
  });

/** Booking cancellation email */
const sendCancellationEmail = (booking, user, property) =>
  sendEmail({
    to: user.email,
    subject: `❌ Booking Cancelled – ${property.title}`,
    html: baseTemplate(`
      <h2>Booking Cancelled</h2>
      <p>Hi ${user.name}, your booking has been cancelled.</p>
      <div class="info-box">
        <strong>Confirmation Code:</strong> ${booking.confirmationCode}<br>
        <strong>Property:</strong> ${property.title}<br>
        <strong>Dates:</strong> ${new Date(booking.checkIn).toDateString()} – ${new Date(booking.checkOut).toDateString()}
      </div>
      <p>If you have any questions, please contact our support team.</p>
    `),
  });

/** Payment success email */
const sendPaymentSuccessEmail = (payment, user, booking) =>
  sendEmail({
    to: user.email,
    subject: '💳 Payment Successful – GO RESORT',
    html: baseTemplate(`
      <h2>Payment Confirmed! 💰</h2>
      <p>Hi ${user.name}, your payment was successful.</p>
      <div class="info-box">
        <strong>Payment ID:</strong> ${payment.razorpayPaymentId}<br>
        <strong>Booking Code:</strong> ${booking.confirmationCode}<br>
        <strong>Amount Paid:</strong> ₹${(payment.amount / 100).toLocaleString()}
      </div>
    `),
  });

module.exports = {
  sendEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendBookingConfirmationEmail,
  sendNewBookingNotificationToHost,
  sendCancellationEmail,
  sendPaymentSuccessEmail,
};
