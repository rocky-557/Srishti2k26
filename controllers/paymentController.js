/**
 * Payment Controller — handles payment initiation and confirmation.
 * 
 * Ports:
 *   modules/payprocess.php → initiatePayment()
 *   payconfirm.php         → confirmPayment()
 */
const crypto = require('crypto');
const { encrypt, decrypt } = require('../utils/encryption');
const Payment = require('../models/Payment');
const User = require('../models/User');
const Registration = require('../models/Registration');

// Workshop code → name mapping for Srishti 2k26
const WORKSHOP_CODE_MAP = {
  'WS1': 'From Pixels to Intelligence: Hands-on Computer Vision with YOLO',
  'WS2': 'Powering Future Mobility: Hands-on EV Electronics Design with KiCad',
  'WS3': 'Automotive ECU Development: Hands-on Model-Based Design with Simulink',
  'WS4': 'Power Electronics: From MATLAB Simulation to Hardware Implementation',
  'WS5': 'Industrial IoT & Industry 4.0 – Industrial Communication Protocols, Edge Gateways & Cloud Data Visualization',
  'WS6': 'The Future of Automotive Safety: Advanced Driver Assistance Systems (ADAS)',
  'WS7': 'ROS 2 Jazzy: From Bot simulation to Autonomous Robotics with TurtleBot3',
  'WS8': 'Building Your Own AI Assistant: From Concept to Implementation',
  'WS9': 'UI/UX Design with Figma & AI: From Ideas to Interactive Prototypes',
  'WS10': 'AI-Powered Digital Twins: Modeling, Simulation & Intelligent Systems'
};

/**
 * POST /api/payment/process
 * 
 * Mirrors modules/payprocess.php:
 * - Determines fee based on type code
 * - Generates transaction ID
 * - Creates payment record
 * - Encrypts data for PSG gateway
 * - Returns the gateway redirect URL
 */
async function initiatePayment(req, res) {
  try {
    if (!req.session.email) {
      return res.redirect('/login.html');
    }

    const type = req.body.type;
    if (!type) {
      return res.send('false');
    }

    const email = req.session.email;
    const memberId = req.session.login;

    if (!memberId) {
      return res.send('false');
    }

    // Determine fees based on type (same logic as PHP switch)
    let fees;
    switch (type) {
      case 'GEN':
        // Check if already paid
        if (req.session.genfee === 'paid') {
          return res.send('already');
        }
        // PSG students pay ₹1 (test) / others pay ₹2 (test) — matches PHP values
        if (req.session.cgname === 'PSG College of Technology' || req.session.cgname === 'PSG Institute of Technology') {
          fees = 1;
        } else {
          fees = 2;
        }
        break;
      case 'AIO': fees = 1; break;    // 700
      case 'INT': fees = 650; break;   // 650
      case 'HAN': fees = 1; break;     // 800
      case 'PRO': fees = 1; break;     // 700
      case 'NAN': fees = 1; break;     // 700
      case 'MAT': fees = 600; break;   // 600
      case 'EDI': fees = 600; break;   // 600
      case 'DAT': fees = 1; break;     // 600
      case 'COD': fees = 1; break;     // 600
      default: fees = 750; break;
    }

    // Generate transaction ID (same format as PHP)
    const randomSuffix = crypto.createHash('md5')
      .update(Date.now().toString() + Math.random().toString())
      .digest('hex')
      .substring(0, 6);
    const transactionId = `SRISHTI_${type}_${memberId}${randomSuffix}`;

    // Create payment record
    const now = new Date();
    await Payment.create({
      memberId,
      name: req.session.name,
      amount: fees,
      transactionId,
      paymentStatus: 'Created',
      addedOn: now
    });

    // Build payment data string (same format as PHP)
    const name = req.session.name.replace(/ /g, '$');
    const returnUrl = process.env.PAYMENT_RETURN_URL;
    const data = `reg_id=SRISHTI25${memberId} name=${name} email=${email} category=17 txn_id=${transactionId} amt=${fees} client_returnurl=${returnUrl} provider=2`;

    // Hash and encrypt (same as PHP)
    const hash = crypto.createHash('sha256').update(data).digest('base64');
    const finalStr = data + hash;
    const encData = encrypt(finalStr);

    const url = `${process.env.PAYMENT_GATEWAY_URL}?payment=${encData}`;
    return res.send(url);
  } catch (err) {
    console.error('Payment process error:', err);
    return res.send('false');
  }
}

/**
 * GET /payconfirm?data=...
 * 
 * Mirrors payconfirm.php:
 * - Decrypts gateway callback data
 * - Updates payment status
 * - Updates workshop fees if applicable
 * - Sends confirmation email via Mailjet
 * - Renders HTML status page
 */
async function confirmPayment(req, res) {
  try {
    if (!req.query.data) {
      return res.redirect('/home.html');
    }

    // Decrypt response from payment gateway
    const decryptedResponse = decrypt(req.query.data);
    const arrResponse = decryptedResponse.split('&');

    const idStr = arrResponse[0] || '';
    const memberId = parseInt(idStr.substring(9)) || 0; // Skip 'order_id=' prefix
    const transactionId = arrResponse[2] || '';
    const status = parseInt((arrResponse[3] || '').charAt(0)) || 0;

    if (memberId === 0) {
      return res.send('<h2>contact support</h2><a href="/home.html#contact"> CONTACT </a>');
    }

    let hero = '';

    if (status === 1) {
      // Check payment record
      const payment = await Payment.findOne({ transactionId });
      if (!payment) {
        return res.redirect('/home.html');
      }

      if (payment.paymentStatus !== 'success') {
        // Update payment status
        await Payment.updateOne({ transactionId }, { paymentStatus: 'success' });

        // Find the user
        const user = await User.findOne({ memberId });
        if (!user) {
          return res.redirect('/home.html');
        }

        const email = user.email;
        const name = user.name;
        hero = 'Payment Successful!';
        const type = transactionId.split('_')[1];
        const srishtiId = 'SRiSHTi25' + memberId;

        let wsname = null;

        if (type === 'GEN') {
          // Update general fee status
          await User.updateOne({ email }, { genfee: 'paid' });
          // Update session if this is the current user
          if (req.session && req.session.email === email) {
            req.session.genfee = 'paid';
          }
        } else if (WORKSHOP_CODE_MAP[type]) {
          wsname = WORKSHOP_CODE_MAP[type];
        }

        // Update workshop fee status if applicable
        if (wsname) {
          await Registration.updateOne(
            { email, type: 'workshop', name: wsname },
            { fees: 'paid' }
          );
        }

        // --- Send confirmation email via Mailjet ---
        try {
          const Mailjet = require('node-mailjet');
          const mailjet = Mailjet.apiConnect(
            process.env.MAILJET_API_KEY,
            process.env.MAILJET_SECRET_KEY
          );

          let subject, htmlBody;
          if (wsname) {
            subject = "Your SRiSHTi 2k25 Workshop Registration is Confirmed!";
            htmlBody = `<h1>Thank You, ${name}!</h1>
                        <p>Your registration for the workshop <strong>'${wsname}'</strong> is confirmed.</p>
                        <p>Your SRiSHTi ID is: <strong>${srishtiId}</strong>.</p>
                        <p>We look forward to seeing you there!</p>`;
          } else {
            subject = "Your SRiSHTi 2k25 Registration is Confirmed!";
            htmlBody = `<h1>Payment Successful, ${name}!</h1>
                        <p>Thank you for registering for SRiSHTi 2k25. Your participation is confirmed.</p>
                        <p>Your SRiSHTi ID is: <strong>${srishtiId}</strong>.</p>`;
          }

          await mailjet.post('send', { version: 'v3.1' }).request({
            Messages: [{
              From: {
                Email: process.env.MAILJET_SENDER_EMAIL,
                Name: process.env.MAILJET_SENDER_NAME
              },
              To: [{
                Email: email,
                Name: name
              }],
              Subject: subject,
              HTMLPart: htmlBody
            }]
          });
        } catch (emailErr) {
          console.error('Mailjet error:', emailErr.message);
          // Don't fail the whole request if email fails
        }
      } else {
        // Already processed — redirect
        return res.redirect('/home.html');
      }
    } else {
      hero = 'Payment Failed';
    }

    // Render HTML status page (same as payconfirm.php's inline HTML)
    const statusClass = status === 1 ? 'success' : 'failure';
    const iconChar = status === 1 ? '&#10003;' : '&#10007;';

    let bodyContent;
    if (status === 1) {
      bodyContent = `
        <div class="status-card success">
          <div class="icon-wrapper success"><span>${iconChar}</span></div>
          <h1>${hero}</h1>
          <p><strong>Thank You!</strong> We are excited to have you with us at SRiSHTi 2k25! A confirmation email has been sent to you.</p>
          <a href="/home.html" class="btn">Back to Home</a>
          <a href="/events.html" class="btn">Back to Events</a>
          <div class="footer-text">Having trouble? <a href="/home.html#contact">Contact Support</a></div>
        </div>`;
    } else {
      bodyContent = `
        <div class="status-card failure">
          <div class="icon-wrapper failure"><span>${iconChar}</span></div>
          <h1>${hero}</h1>
          <p>We're sorry, but we couldn't process your payment. Please try the following steps:</p>
          <ul>
            <li>Retry the payment after a few minutes.</li>
            <li>Clear your browser's cache and try again.</li>
            <li>Ensure your payment details are correct.</li>
          </ul>
          <a href="/home.html" class="btn">Try Again</a>
          <div class="footer-text">If the problem persists, <a href="/home.html#contact">please contact us</a> for assistance.</div>
        </div>`;
    }

    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Status - SRiSHTi 2k25</title>
  <link rel="icon" href="assets/SRiSHTi-logo.png">
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Poppins', sans-serif; background-color: #f4f7f6; margin: 0; padding: 20px; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
    .status-card { background-color: #ffffff; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.07); text-align: center; padding: 40px 30px; max-width: 450px; width: 100%; border-top: 6px solid; }
    .status-card.success { border-color: #28a745; }
    .status-card.failure { border-color: #dc3545; }
    .icon-wrapper { width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 25px; display: flex; justify-content: center; align-items: center; font-size: 40px; color: #fff; }
    .icon-wrapper.success { background-color: #28a745; }
    .icon-wrapper.failure { background-color: #dc3545; }
    h1 { font-size: 26px; font-weight: 700; margin-bottom: 15px; color: #333; }
    p { color: #666; font-size: 16px; line-height: 1.6; margin-bottom: 30px; }
    ul { list-style: none; padding: 0; text-align: left; margin: 0 auto 30px; max-width: 320px; color: #666; }
    ul li { position: relative; padding-left: 25px; margin-bottom: 12px; }
    ul li::before { content: '›'; position: absolute; left: 0; color: #dc3545; font-weight: bold; font-size: 20px; }
    .btn { display: inline-block; background-color: #007bff; color: #fff; padding: 12px 35px; border-radius: 50px; text-decoration: none; font-weight: 600; font-size: 16px; transition: all 0.3s; margin: 5px; }
    .btn:hover { background-color: #0056b3; transform: translateY(-2px); }
    .footer-text { margin-top: 30px; font-size: 14px; color: #888; }
    .footer-text a { color: #007bff; text-decoration: none; font-weight: 600; }
  </style>
</head>
<body>${bodyContent}</body>
</html>`);
  } catch (err) {
    console.error('Payment confirm error:', err);
    return res.redirect('/home.html');
  }
}

module.exports = { initiatePayment, confirmPayment };
