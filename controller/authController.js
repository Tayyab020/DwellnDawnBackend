const Joi = require("joi");
const User = require("../models/user");
const bcrypt = require("bcryptjs");
const UserDTO = require("../dto/user");
const JWTService = require("../services/JWTService");
const RefreshToken = require("../models/token");
const cloudinary = require('cloudinary').v2;
 const streamifier = require('streamifier');
const Blog=require('../models/blog')
const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,25}$/;
const sendEmail = require('../utills/sendEmail');
const OTP = require('../models/otp');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const authController = {

  async  requestOtp(req, res) {
  const schema = Joi.object({
    email: Joi.string().email().required(),
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, message: "Invalid email format." });
  }

  const { email } = req.body;

  try {
    const user = await User.findOne({ email });

    

    // Clean any existing unverified OTP
    await OTP.deleteOne({ email });

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = Date.now() + 10 * 60 * 1000;

    const otpRecord = new OTP({
      email,
      otp,
      otpExpiry,
      isVerified: false,
    });

    await otpRecord.save();

    const emailBody = `Your OTP is: ${otp}. It will expire in 10 minutes.`;
    await sendEmail(email, 'Your OTP Code', emailBody);

    return res.status(200).json({
      success: true,
      message: 'OTP sent to your email. Please verify to continue.',
    });

  } catch (err) {
    console.error("Error sending OTP:", err);
    return res.status(500).json({ success: false, message: "Server error. Please try again." });
  }
},

// Register user and send OTP
async  register(req, res, next) {
  console.log('Registering...');

  // 1. Validate input
  const registerSchema = Joi.object({
    email: Joi.string().email().required(),
    name: Joi.string().required(),
    phone: Joi.string().min(10).required(),
    password: Joi.string().min(6).max(30).required(),
    confirmPassword: Joi.ref('password'),
    role: Joi.string().valid('provider', 'buyer', 'admin').default('buyer'),
  });

  const { error } = registerSchema.validate(req.body);
  if (error) return next(error);

  const { email, name, phone, password, role } = req.body;

  let otpRecord = null;
  let user = null;

  try {
    // 2. Check if the user is already registered
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      if (existingUser.isVerified) {
        // If the user is already verified
        return res.status(409).json({ message: 'Email already registered and verified.' });
      } else {
        // If the user is registered but not verified, send a new OTP
        console.log('User exists but not verified. Sending new OTP...');
        
        // Clean up any existing OTP records if the old one expired or is unverified
        await OTP.deleteOne({ email });

        // 3. Generate new OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiry = Date.now() + 10 * 60 * 1000; // OTP valid for 10 minutes

        // 4. Save OTP (new one)
        otpRecord = new OTP({
          email,
          otp,
          otpExpiry,
          isVerified: false,
        });

        await otpRecord.save(); // Save OTP to DB

        // 5. Send OTP email
        const emailBody = `Your OTP is: ${otp}. It will expire in 10 minutes.`;
        await sendEmail(email, 'Your Registration OTP', emailBody);

        console.log('OTP email sent to:', email);

        // 6. Return response
        return res.status(200).json({
          message: 'OTP sent to your email. Please verify to complete registration.',
        });
      }
    } else {
      // 7. If the user does not exist, proceed with normal registration
      console.log('No existing user found. Proceeding with new registration...');

      // 8. Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // 9. Generate OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpiry = Date.now() + 10 * 60 * 1000; // OTP valid for 10 minutes

      // 10. Save OTP (new one)
      otpRecord = new OTP({
        email,
        otp,
        otpExpiry,
        isVerified: false,
      });

      await otpRecord.save(); // Save OTP to DB

      // 11. Save user with isVerified = false
      user = new User({
        email,
        name,
        phone,
        password: hashedPassword,
        role,
        isVerified: false,
      });

      await user.save(); // Save user to DB

      // 12. Send OTP email
      const emailBody = `Your OTP is: ${otp}. It will expire in 10 minutes.`;
      await sendEmail(email, 'Your Registration OTP', emailBody);

      console.log('OTP email sent to:', email);

      // 13. Return response
      return res.status(200).json({
        message: 'OTP sent to your email. Please verify to complete registration.',
      });
    }
  } catch (err) {
    console.error('Error during registration:', err);

    // If OTP email failed, clean up the DB (rollback user and OTP)
    if (otpRecord) {
      console.log('Rolling back OTP record...');
      await OTP.deleteOne({ email }); // Delete the OTP record from DB
    }

    if (user) {
      console.log('Rolling back user...');
      await User.deleteOne({ email }); // Delete the user record from DB
    }

    return next(err); // Propagate error for proper response
  }
},

// Login user (only verified users can login)
async login(req, res, next) {
  // 1. Validate user input
  const userLoginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().pattern(passwordPattern),
  });

  const { error } = userLoginSchema.validate(req.body);
  if (error) return next(error);

  const { email, password } = req.body;

  let user;

  try {
    // 2. Find user by email
    user = await User.findOne({ email });
    if (!user) {
      return next({
        status: 401,
        message: "Invalid email or user not found",
      });
    }

    // 3. Check if the user is verified
    if (!user.isVerified) {
      return next({
        status: 401,
        message: "Account is not verified. Please verify your email to login.",
      });
    }

    // 4. Match password
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return next({
        status: 401,
        message: "Invalid password",
      });
    }

    // 5. Generate tokens
    const accessToken = JWTService.signAccessToken({ _id: user._id }, "300000m");
    const refreshToken = JWTService.signRefreshToken({ _id: user._id }, "600000m");

    // 6. Update refresh token in database
    await RefreshToken.updateOne(
      { _id: user._id },
      { token: refreshToken },
      { upsert: true }
    );

    // 7. Send tokens in cookies
    res.cookie("accessToken", accessToken, {
      maxAge: 1000 * 60 * 60 * 24 * 30,
      httpOnly: true,
    });
    res.cookie("refreshToken", refreshToken, {
      maxAge: 1000 * 60 * 60 * 24 * 30,
      httpOnly: true,
    });

    const userDto = new UserDTO(user);
    return res.status(200).json({ user: userDto, auth: true });
  } catch (error) {
    return next(error);
  }
},

// Verify OTP and set isVerified to true
async verifyOtp(req, res, next) {
  try {
    console.log('Verifying OTP...');
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required.' });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Find OTP record
    const otpRecord = await OTP.findOne({ otp, isVerified: false });
    if (!otpRecord || otpRecord.otpExpiry < Date.now()) {
      return res.status(400).json({ message: 'Invalid or expired OTP.' });
    }

    // Mark user as verified
    user.isVerified = true;
    await user.save();

    // Delete OTP record after successful verification
    await OTP.deleteOne({ _id: otpRecord._id });

    // Generate tokens
    const accessToken = JWTService.signAccessToken({ _id: user._id }, '300000m');
    const refreshToken = JWTService.signRefreshToken({ _id: user._id }, '600000m');
    await JWTService.storeRefreshToken(refreshToken, user._id);

    // Set cookies
    res.cookie('accessToken', accessToken, { maxAge: 86400000, httpOnly: true });
    res.cookie('refreshToken', refreshToken, { maxAge: 86400000, httpOnly: true });

    // Send response
    const userDto = new UserDTO(user);
    return res.status(200).json({ user: userDto, auth: true });

  } catch (err) {
    return next(err);
  }
}
,

// Reset password (user must verify OTP first)
async resetPassword(req, res, next) {
  const { email, otp, newPassword } = req.body;
  const user = await User.findOne({ email });
  const otpRecord = await OTP.findOne({ otp });

  if (!user || !otpRecord || otpRecord.otp !== otp || otpRecord.otpExpiry < Date.now()) {
    return res.status(400).json({ message: 'Invalid or expired OTP' });
  }

  user.password = await bcrypt.hash(newPassword, 10);
  otpRecord.isVerified = false; // Reset OTP verification
  await otpRecord.save();
  await user.save();

  res.status(200).json({ message: 'Password reset successful' });
},

// Forgot password (generate OTP)
async forgotPassword(req, res, next) {
  const { email } = req.body;
  const user = await User.findOne({ email });

  if (!user) return res.status(404).json({ message: 'User not found' });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpExpiry = Date.now() + 10 * 60 * 1000; // OTP valid for 10 minutes

  // Save OTP
  const otpRecord = new OTP({
    email,
    otp,
    otpExpiry,
    isVerified: false,
  });
  await otpRecord.save();

  await sendEmail(email, 'Reset Password OTP', `Your OTP to reset password is ${otp}`);

  res.status(200).json({ message: 'OTP sent to your email.' });
},
  
  async getUserById(req, res, next) {
    try {
      const userId = req.params.id;
      console.log('Fetching user by ID:', userId);

      // Optional: validate ObjectId if using MongoDB
      // const isValidId = mongoose.Types.ObjectId.isValid(userId);
      // if (!isValidId) return res.status(400).json({ message: 'Invalid user ID' });

      const user = await User.findById(userId).select('-password'); // Exclude password field

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.status(200).json(user);
    } catch (error) {
      console.error('Error fetching user by ID:', error);
      next(error); // pass to error handler middleware
    }
  },
 async block(req, res, next) {
  try {
    console.log('blo');
    const post = await Blog.findByIdAndUpdate(
      req.params.id,
      { isBlocked: true },
      { new: true }
    );
    console.log('post', post);
    
    if (!post) return res.status(404).json({ message: "Post not found" });
    
    res.json({ message: "Post blocked", post });
  } catch (err) {
    console.error("Block error:", err); // Better debug
    res.status(500).json({ message: "Error blocking post" });
  }
},

  async getAllUser(req, res, next) {
    try {
    //   console.log('gettinggggg')
    // if (req.user.role !== 'admin') {
    //   return res.status(403).json({ message: 'Access denied' });
    // }

    const users = await User.find().select('-password');
    res.json({ users });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
  },
  async refresh(req, res, next) {
    // 1. get refreshToken from cookies
    // 2. verify refreshToken
    // 3. generate new tokens
    // 4. update db, return response

    const originalRefreshToken = req.cookies.refreshToken;

    let id;

    try {
      id = JWTService.verifyRefreshToken(originalRefreshToken)._id;
    } catch (e) {
      const error = {
        status: 401,
        message: "Unauthorized",
      };

      return next(error);
    }

    try {
      const match = RefreshToken.findOne({
        _id: id,
        token: originalRefreshToken,
      });

      if (!match) {
        const error = {
          status: 401,
          message: "Unauthorized",
        };

        return next(error);
      }
    } catch (e) {
      return next(e);
    }

    try {
      const accessToken = JWTService.signAccessToken({ _id: id }, "300000m");

      const refreshToken = JWTService.signRefreshToken({ _id: id }, "600000m");

      await RefreshToken.updateOne({ _id: id }, { token: refreshToken });

      res.cookie("accessToken", accessToken, {
        maxAge: 1000 * 60 * 60 * 24,
        httpOnly: true,
      });

      res.cookie("refreshToken", refreshToken, {
        maxAge: 1000 * 60 * 60 * 24,
        httpOnly: true,
      });
    } catch (e) {
      return next(e);
    }

    const user = await User.findOne({ _id: id });

    const userDto = new UserDTO(user);

    return res.status(200).json({ user: userDto, auth: true });
  },
// Enhanced with proper error handling and status codes
async updateUser(req, res, next) {
  try {console.log('updating')
    const userId = req.params.id;
    const { name, phone, email, profileImage, location } = req.body;
    
    // Validate required fields
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Build update object
    const updateData = {};
    if (name) updateData.name = name;
    if (phone) updateData.phone = phone;
    if (email) updateData.email = email;
    if (profileImage) updateData.profileImage = profileImage;
    
    // Handle location update
    if (location) {
      if (!location.coordinates || location.coordinates.length !== 2) {
        return res.status(400).json({ error: 'Invalid location format' });
      }
      
      updateData.location = {
        type: 'Point',
        coordinates: [
          parseFloat(location.coordinates[0]), // longitude
          parseFloat(location.coordinates[1])  // latitude
        ]
      };
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      message: 'Location updated successfully',
      user: updatedUser
    });
    
  } catch (error) {
    console.error('Update error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Server error',
      details: error.message 
    });
  }
},
  async updateProfileImage(req, res, next) {
  console.log('Updating profile image');
  const { id } = req.params;
  console.log(id);

  const schema = Joi.object({
    // No need to validate base64 now, but you can validate req.file if needed
  });

  const { error } = schema.validate({});
  if (error) {
    return next(error);
  }

  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  try {
    const streamUpload = (req) => {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'profile_images' },
          (error, result) => {
            if (result) {
              resolve(result);
            } else {
              reject(error);
            }
          }
        );
        streamifier.createReadStream(req.file.buffer).pipe(stream);
      });
    };

    const uploadResult = await streamUpload(req);
    const photoUrl = uploadResult.secure_url;

    await User.updateOne({ _id: id }, { profileImage: photoUrl });

    const user = await User.findOne({ _id: id });
    const userDto = new UserDTO(user);

    return res.status(200).json({ user: userDto, auth: true });
  } catch (error) {
    return next(error);
    }
  },
  async getProfileImage(req, res, next) {
    try {
      const { userId } = req.params;
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      res.status(200).json({ profileImage: user.profileImage });
    } catch (error) {
      return next(error);
    }
  },
  
};


module.exports = authController;
