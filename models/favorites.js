const mongoose = require('mongoose');

// Favorite schema where each user can have many items, and each item can belong to many users
const favoriteSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    required: true, 
    ref: 'User' // Reference to User model
  },
  items: [
    {
      itemId: { 
        type: mongoose.Schema.Types.ObjectId, 
        required: true, 
        ref: 'Blog'
      },
      addedAt: {
        type: Date,
        default: Date.now
      }
    }
  ]
});

// You can define methods to add/remove items here if needed

const Favorite = mongoose.model('Favorite', favoriteSchema);
module.exports = Favorite;
