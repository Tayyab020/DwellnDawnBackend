const mongoose = require('mongoose');

const { Schema } = mongoose;

const userSchema = new Schema({
  // username: { type: String, required: true },
  name: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, required: true },
  password: { type: String, required: true },
  profileImage: { type: String },
  role: { type: String, enum: ['admin', 'provider', 'buyer'] },
   isVerified: { type: Boolean, default: false },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],  // [longitude, latitude]
      index: '2dsphere'  // Create geospatial index
    }
  },
  designation: { type: String }, // Optional field for designation
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema, 'users');
