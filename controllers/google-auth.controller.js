import passport from "passport";
import { User } from "../models/User.js";
import { generateAccessToken } from "../utils/generateToken.js";

// Start Google login
export const googleAuth = passport.authenticate("google", {
  scope: [
    "profile",
    "email",
    "https://www.googleapis.com/auth/drive",
    "https://www.googleapis.com/auth/drive.file",
  ],
  accessType: "offline",
  prompt: "consent",
});

// Google OAuth callback
export const googleCallback = (req, res, next) => {
  passport.authenticate("google", async (err, user) => {
    if (err || !user) {
      console.error("Google authentication error:", err);
      return res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Authentication Failed</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                margin: 0;
                background: #fee;
              }
              .container {
                text-align: center;
                background: white;
                padding: 40px;
                border-radius: 10px;
                box-shadow: 0 10px 40px rgba(0,0,0,0.1);
              }
              .error {
                color: #ef4444;
                font-size: 48px;
                margin-bottom: 20px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="error">✗</div>
              <h1>Authentication Failed</h1>
              <p>Unable to connect. This window will close...</p>
            </div>
            <script>
              console.error('Authentication failed');
              setTimeout(() => window.close(), 2000);
            </script>
          </body>
        </html>
      `);
    }

    try {
      // console.log(' Google auth successful for user:', user.email);
      
      // Create JWT tokens
      const payload = { id: user._id, email: user.email };
      const accessToken = generateAccessToken(payload);

      res.cookie("access_token", accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/'
      });

     
      console.log(' Cookies set successfully');

      // Return beautiful success page
      return res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Authentication Successful</title>
            <meta charset="UTF-8">
            <style>
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
              }
              body {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              }
              .container {
                text-align: center;
                background: white;
                padding: 50px 40px;
                border-radius: 20px;
                box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                max-width: 450px;
                animation: slideUp 0.5s ease-out;
              }
              @keyframes slideUp {
                from {
                  opacity: 0;
                  transform: translateY(30px);
                }
                to {
                  opacity: 1;
                  transform: translateY(0);
                }
              }
              .success {
                width: 80px;
                height: 80px;
                background: #10b981;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 25px;
                animation: scaleIn 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
              }
              @keyframes scaleIn {
                from { transform: scale(0) rotate(-180deg); }
                to { transform: scale(1) rotate(0); }
              }
              .checkmark {
                color: white;
                font-size: 48px;
                font-weight: bold;
              }
              h1 {
                color: #1f2937;
                margin-bottom: 15px;
                font-size: 28px;
              }
              .email {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 12px 20px;
                border-radius: 10px;
                margin: 20px 0;
                font-weight: 500;
                font-size: 16px;
              }
              p {
                color: #6b7280;
                line-height: 1.6;
                margin: 10px 0;
              }
              .countdown {
                color: #667eea;
                font-weight: bold;
                font-size: 18px;
                margin-top: 20px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="success">
                <div class="checkmark">✓</div>
              </div>
              <h1>Connected Successfully!</h1>
              <div class="email">${user.email}</div>
              <p>Your Google Drive has been connected.</p>
              <p>You can now access your files and schedule posts.</p>
              <p class="countdown">Closing in <span id="countdown">3</span>s...</p>
            </div>
            <script>
              console.log('✅ Google auth successful');
              console.log('Email: ${user.email}');
              
              let count = 3;
              const countdownEl = document.getElementById('countdown');
              const interval = setInterval(() => {
                count--;
                countdownEl.textContent = count;
                if (count <= 0) {
                  clearInterval(interval);
                  window.close();
                }
              }, 1000);
            </script>
          </body>
        </html>
      `);
    } catch (error) {
      console.error("❌ Error during Google callback:", error);
      return res.send(`
        <!DOCTYPE html>
        <html>
          <head><title>Error</title></head>
          <body>
            <h1>Authentication Error</h1>
            <p>An error occurred. Please try again.</p>
            <script>
              console.error('Auth error:', '${error.message}');
              setTimeout(() => window.close(), 3000);
            </script>
          </body>
        </html>
      `);
    }
  })(req, res, next);
};

// Get current user
export const getCurrentUser = async (req, res) => {
  try {
    if (!req.user)
      return res
        .status(401)
        .json({ success: false, message: "Not authenticated" });

    const user = await User.findById(req.user._id).select("-__v");
    return res.status(200).json({ success: true, user });
  } catch (err) {
    console.error("Error fetching user:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Logout
export const logout = (req, res) => {
  req.logout((err) => {
    if (err) console.error("Logout error:", err);
    res.clearCookie("access_token");
    res.redirect(`${process.env.CLIENT_URL}/login`);
  });
};


