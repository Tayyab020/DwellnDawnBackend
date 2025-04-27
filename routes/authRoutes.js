const express = require('express');
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Basic routes
router.post('/register', authController.register);
router.post('/login', authController.login);

// Social auth routes - these should be GET, not POST
router.get('/auth/google', authController.googleAuth);
router.get('/auth/google/callback', authController.googleAuthCallback);
router.get('/auth/facebook', authController.facebookAuth);
router.get('/auth/facebook/callback', authController.facebookAuthCallback);

// Protected route example
router.get('/protected-route', authMiddleware, (req, res) => {
  res.json({ message: 'This is a protected route.' });
});

// Logout route (you might want to add this)
router.post('/logout', authController.logout);

module.exports = router;