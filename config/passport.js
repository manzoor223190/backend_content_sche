import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { User } from "../models/User.js";
import dotenv from "dotenv";

dotenv.config();

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_REDIRECT_URI,
    },
    async (accessToken, refreshToken, profile, done) => {
      // console.log("Google OAuth callback:", profile);
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) return done(new Error("Google account email not found"));

        let user = await User.findOne({ email });

        if (!user) {
          user = await User.create({
            name: profile.displayName,
            email,
            googleTokens: {
              access_token: accessToken,
              refresh_token: refreshToken,
              token_type: "Bearer",
              expiry_date: Date.now() + 3600 * 1000,
            },
          });
        } else {
          user.googleTokens = {
            access_token: accessToken,
            refresh_token: refreshToken || user.googleTokens?.refresh_token,
            token_type: "Bearer",
            expiry_date: Date.now() + 3600 * 1000,
          };
          await user.save();
        }

        return done(null, user);
      } catch (err) {
        console.error("Google auth error:", err);
        return done(err, null);
      }
    }
  )
);

passport.serializeUser((user, done) => done(null, user._id));

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

export default passport;
