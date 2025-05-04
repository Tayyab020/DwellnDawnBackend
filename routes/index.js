const express = require('express');
const authController = require('../controller/authController');
const blogController = require('../controller/blogController');
const commentController = require('../controller/commentController');
const  orderController = require('../controller/orderController');
const locationController = require('../controller/locationController');
const upload = require('../middlewares/multer');
const auth = require('../middlewares/auth');
const favController= require('../controller/addToFavController');
const router = express.Router();
const passport = require('passport');
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
router.get('/', (req, res) => {
    console.log("working");
    res.status(200).json({
        message: "working"
    });
});

// user

router.post('/request-otp',authController.requestOtp);

// Google

// —————— Flutter Google Sign-In (POST) ——————
router.post('/google', async (req, res) => {
  try {
    const { idToken } = req.body; // From Flutter

    // 1. Verify Google ID token
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();

    // 2. Check if user exists (using email, not googleId)
    let user = await User.findOne({ email: payload.email });
    
    if (!user) {
      // 3. Create new user if not found
      user = await User.create({
        name: payload.name,
        email: payload.email,
        profileImage: payload.picture, // Google profile photo
        isVerified: true,
        role: 'buyer',
      });
    }

    // 4. Generate JWT for Flutter
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // 5. Send token + user data to Flutter
    res.json({
      success: true,
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profileImage: user.profileImage,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    res.redirect('/dashboard'); // or send tokens
  }
);

// Facebook
router.get('/facebook', passport.authenticate('facebook', { scope: ['email'] }));
router.get('/facebook/callback',
  passport.authenticate('facebook', { failureRedirect: '/login' }),
  (req, res) => {
    res.redirect('/dashboard');
  }
);

// register
router.post('/register', authController.register);

// login
router.post('/login', authController.login);

// logout
// router.post('/logout', auth, authController.logout);
// Verify OTP - Does not require authentication
router.post('/verify-otp', authController.verifyOtp);

// Forgot Password - Does not require authentication
router.post('/forgot-password', authController.forgotPassword);

// Reset Password - Does not require authentication
router.post('/reset-password', authController.resetPassword);


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

// comment
// create 
router.post('/comment', auth, commentController.create);

// get 
router.get('/comment/:id', auth, commentController.getById);


module.exports = router;