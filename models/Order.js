const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Blog', // or 'Product' if you rename it later
    required: true,
  },
  orderedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  name: { type: String },                // Order for John Doe
  description: { type: String },         // Special instructions
  address: { type: String },
  phone: { type: String },
  alternativePhone: { type: String },

  // 🔥 New Fields Below
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'delivered', 'cancelled'],
    default: 'pending'
  },

 
  paymentStatus: {
    type: String,
    enum: ['unpaid', 'paid'],
    default: 'unpaid'
  },



  deliveryDate: { // Optional
    type: Date
  }

}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
