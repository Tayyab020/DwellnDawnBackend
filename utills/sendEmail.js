require('dotenv').config();
const sgMail = require('@sendgrid/mail');

async function sendEmail(to, subject, text) {
  // Get API key from environment variables
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);

  const msg = {
    to: to,
    from: process.env.SENDGRID_FROM_EMAIL,
    subject: subject,
    text: text,
    // Consider adding HTML version too:
    // html: `<strong>${text}</strong>`,
  };

  try {
    await sgMail.send(msg);
    console.log('Email sent successfully to', to);
    return { success: true };
  } catch (error) {
    console.error('Error sending email:', error.response?.body || error.message);
    return { 
      success: false,
      error: error.response?.body || error.message
    };
  }
}

module.exports = sendEmail;