require('dotenv').config();                // ← load .env immediately
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const FacebookStrategy = require("passport-facebook").Strategy;
const User = require("../models/user");    // adjust path if needed

// ———————————————— Google ————————————————
passport.use(new GoogleStrategy({
    clientID:     process.env.GOOGLE_CLIENT_ID,
    callbackURL:  "/auth/google/callback",    // or full URL if needed
},
  async (accessToken, refreshToken, profile, done) => {
      try {
        
    console.log('a gaiiiiiiiiiiiiiiiiiii')
      let user = await User.findOne({ googleId: profile.id });
      if (!user) {
        user = await User.create({
          name:       profile.displayName,
          email:      profile.emails[0].value,
          googleId:   profile.id,
          isVerified: true,
          role:       'buyer',
        });
      }
      done(null, user);
    } catch (err) {
      done(err, null);
    }
  }
));

// ————————————— Facebook —————————————
// passport.use(new FacebookStrategy({
//     clientID:      process.env.FB_APP_ID,
//     clientSecret:  process.env.FB_APP_SECRET,
//     callbackURL:   "/auth/facebook/callback",
//     profileFields: ["id", "displayName", "emails"]
//   },
//   async (accessToken, refreshToken, profile, done) => {
//     try {
//       let user = await User.findOne({ facebookId: profile.id });
//       if (!user) {
//         user = await User.create({
//           name:        profile.displayName,
//           email:       profile.emails?.[0]?.value || `${profile.id}@facebook.com`,
//           facebookId:  profile.id,
//           isVerified:  true,
//           role:        'buyer',
//         });
//       }
//       done(null, user);
//     } catch (err) {
//       done(err, null);
//     }
//   }
// ));

// ———————————— Sessions (if you’re using them) ————————————
passport.serializeUser((user, done)    => done(null, user.id));
passport.deserializeUser((id, done)    => {
  User.findById(id)
      .then(user => done(null, user))
      .catch(err  => done(err, null));
});
