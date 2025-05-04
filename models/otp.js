const mongoose = require('mongoose');

const OTPSchema = new mongoose.Schema({
  email: { type: String, required: true }, // or use userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  otp: { type: String, required: true },
  otpExpiry: { type: Date, required: true },
  isVerified: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('OTP', OTPSchema);
