const Favorite = require('../models/favorites');

const favController = {
  // Add or remove favorite (toggle functionality)
  async toggleFavorite(req, res) {
    try {
      console.log('nikalooooooooo dalooooooooooo')
      const { itemId, userId, isLiked } = req.body;
console.log('Received toggleFavorite request:', { itemId, userId, isLiked });
      if (!itemId || !userId || typeof isLiked !== 'boolean') {
        return res.status(400).json({ message: 'Invalid request data' });
      }

      let userFavorites = await Favorite.findOne({ userId });

      if (isLiked) {
        // Add to favorites
        if (!userFavorites) {
          userFavorites = new Favorite({
            userId,
            items: [{ itemId }]
          });
        } else {
          const itemExists = userFavorites.items.some(item => 
            item.itemId.toString() === itemId
          );
          if (!itemExists) {
            userFavorites.items.push({ itemId });
          }
        }
      } else {
        // Remove from favorites
        if (!userFavorites) {
          return res.status(200).json({ message: 'Item not in favorites' });
        }
        userFavorites.items = userFavorites.items.filter(item => 
          item.itemId.toString() !== itemId
        );
      }

      await userFavorites.save();
      res.status(200).json({ 
        message: 'Favorite status updated successfully',
        isLiked
      });
    } catch (err) {
      console.error('Error toggling favorite:', err);
      res.status(500).json({ message: 'Server error updating favorite status' });
    }
  },

  // Check if an item is liked by user
// In your favoritesController.js
 async checkFavorite (req, res)  {
   try {
    const { itemId, userId } = req.query;
    console.log('Received checkFavorite request for:', { itemId, userId });

    if (!itemId || !userId) {
      console.log('Missing parameters');
      return res.status(400).json({ error: 'Missing itemId or userId' });
    }

    const userFavorites = await Favorite.findOne({ userId });
    const isLiked = userFavorites?.items.some(item => 
      item.itemId.toString() === itemId
    ) || false;

    console.log('Favorite status:', isLiked);
    res.status(200).json({ isLiked });
    
  } catch (err) {
    console.error('Error in checkFavorite:', err);
    res.status(500).json({ 
      error: 'Server error checking favorite status',
      details: err.message 
    });
  }
},

  // Get all favorite items for a user
async getFavorites(req, res) {
  try {
    console.log('Received getFavorites request:', req.params);
    const { userId } = req.params;

    const userFavorites = await Favorite.findOne({ userId })
      .populate('items.itemId'); // Only populate needed fields
console.log('userFavorites',userFavorites.items)
    if (!userFavorites) {
      return res.status(200).json({ items: [] });
    }

    res.status(200).json(userFavorites.items);
  } catch (err) {
    console.error('Error getting favorites:', err);
    res.status(500).json({ message: 'Server error getting favorites' });
  }
}

};

module.exports = favController;