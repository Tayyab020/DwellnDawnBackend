const express = require('express');
const authController = require('../controller/authController');
const blogController = require('../controller/blogController');
const commentController = require('../controller/commentController');
const appointmentController = require('../controller/appointmentController');
const  orderController = require('../controller/orderController');
const locationController = require('../controller/locationController');
const upload = require('../middlewares/multer');
const auth = require('../middlewares/auth');
const favController= require('../controller/addToFavController');
const router = express.Router();
router.get('/', (req, res) => {
    console.log("working");
    res.status(200).json({
        message: "working"
    });
});

// user

// register
router.post('/register', authController.register);

// login
router.post('/login', authController.login);

// logout
router.post('/logout', auth, authController.logout);

// get user by ID
router.get('/users/:id', authController.getUserById);

//all uses
router.get('/users',authController.getAllUser)

// refresh
router.get('/refresh', authController.refresh);

// update profile image
router.post(
  '/updateProfileImage/:id',
  
  upload.single('profileImage'), // expecting the field name as 'profileImage'
  authController.updateProfileImage
);

//
router.patch("/block/:id",authController.block)

// For image upload
router.post('/updateProfileImage/:id', upload.single('profileImage'), async (req, res) => {
  try {
    const userId = req.params.id;
    const file = req.file;
    
    // Process the file (save to cloud storage or local filesystem)
    const imageUrl = await saveImage(file); // Your implementation
    
    // Update user in database
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { profileImage: imageUrl },
      { new: true }
    );
    
    res.json({ 
      user: updatedUser,
      auth: true 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// For user data update
router.put('/users/:id',authController.updateUser )
// get profile img
router.get('/users/:userId/profile-image', auth, authController.getProfileImage);

//location
router.post('/save-location', auth, locationController.saveLocation); // Add this line



//favorites
// Toggle favorite status (add/remove)
router.post('/addfavorite', favController.toggleFavorite);

/// ✅ Correct (should point to favorites controller)
router.get('/checkfavorite', favController.checkFavorite);

// Get all favorites for user
router.get('/getfav/:userId', favController.getFavorites);





// blog
// create
router.post('/blog',  upload.single('photoPath'),blogController.create);
// router.post('/blog', blogController.create);

// get all
// router.get('/blog/all', auth, blogController.getAll);
router.get('/blog/all', blogController.getAll);

//search 
router.get('/search',blogController.searchByName)

// get blog by id
router.get('/blog/:id', blogController.getById);
// router.get('/blog/:id', blogController.getById);

//get blog by author
router.get("/blogs/author/:authorId", blogController.getByAuthor);
// update
router.put('/blog',auth, blogController.update);

// delete
router.delete('/blog/:id', blogController.delete);



// appointments
router.post('/appointments', auth, appointmentController.create);
// router.get('/appointments/all', auth, appointmentController.getAll);
router.get('/appointment/:tailorId', auth, appointmentController.getAll);


//order
// Create order
router.post('/createOrder', orderController.createOrder);

// Get all orders
router.get('/order', orderController.getAllOrders);

// Get order by ID
router.get('/:id', orderController.getOrderById);

// Get orders placed by a user
router.get('/ordered-by/:userId', orderController.getOrdersByUserId);

// Get orders for blogs created by an author
router.get('/author/:authorId', orderController.getOrdersByAuthorId);

//update status
// Update order status by ID
router.put('/update-status/:id', orderController.updateOrderStatus);


// router.post('/appointment', appointmentController.create);
// router.get('/appointments', appointmentController.getAll);
// router.get('/appointment/:id', appointmentController.getById);
// router.put('/appointment', appointmentController.update);
// router.delete('/appointment/:id', appointmentController.delete);

// comment
// create 
router.post('/comment', auth, commentController.create);

// get 
router.get('/comment/:id', auth, commentController.getById);


module.exports = router;