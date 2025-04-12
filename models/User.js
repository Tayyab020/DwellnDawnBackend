const mongoose = require('mongoose');

const { Schema } = mongoose;

const userSchema = new Schema({
  // username: { type: String, required: true },
  name: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, required: true },
  password: { type: String, required: true },
  profileImage: { type: String },
  role: { type: String, enum: ['admin', 'provider','student'] },
  location: { type: String } // Initially null, can be updated later
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema, 'users');
