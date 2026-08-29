/**
 * Contact Controller — handles contact form email sending.
 * 
 * Ports: modules/sendmsg.php
 */
const nodemailer = require('nodemailer');

/**
 * POST /api/contact
 * 
 * Mirrors modules/sendmsg.php:
 * - Same validation rules (name length, email format, message length)
 * - Same response codes: 'true', 'fname_long', 'fname_short', etc.
 * - Uses nodemailer with Gmail SMTP (replaces PHPMailer)
 */
async function sendMessage(req, res) {
  try {
    const { name, email, message } = req.body;

    // --- Validation (same rules as PHP) ---
    if (!name || name.length > 50) return res.send('fname_long');
    if (name.length < 2) return res.send('fname_short');
    if (!email || email.length > 50) return res.send('email_long');
    if (email.length < 2) return res.send('email_short');

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return res.send('eformat');

    if (!message || message.length > 500) return res.send('message_long');
    if (message.length < 3) return res.send('message_short');

    // Send email via SMTP (same as PHPMailer config)
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT),
      secure: false, // TLS
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    await transporter.sendMail({
      from: `"${name}" <${process.env.SMTP_USER}>`,
      replyTo: email,
      to: process.env.SMTP_RECIPIENT,
      subject: 'Contact Message',
      html: message,
      text: message
    });

    return res.send('true');
  } catch (err) {
    console.error('Contact email error:', err);
    return res.send('Message could not be sent. Mailer Error: ' + err.message);
  }
}

module.exports = { sendMessage };
