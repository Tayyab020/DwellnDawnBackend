const mongoose = require('mongoose');
const { Schema } = mongoose;

const blogSchema = new Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  photoPath: { type: String, required: true },
  author: { type: mongoose.SchemaTypes.ObjectId, ref: 'User' },
  type: { type: String, enum: ['food', 'rental'], required: true },
  isBlocked: { type: Boolean, default: false },
  price: { type: Number, required: true }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for complete author population (excluding password)
blogSchema.virtual('authorDetails', {
  ref: 'User',
  localField: 'author',
  foreignField: '_id',
  justOne: true
});

module.exports = mongoose.model('Blog', blogSchema, 'blogs');