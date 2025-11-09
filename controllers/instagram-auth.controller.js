import axios from "axios";
import jwt from "jsonwebtoken";
import { User } from "../models/User.js";

const {
  INSTAGRAM_CLIENT_ID,
  INSTAGRAM_CLIENT_SECRET,
  INSTAGRAM_REDIRECT_URI,
  JWT_SECRET,
  CLIENT_URL,
  NODE_ENV,
} = process.env;

export const instagramLogin = (req, res) => {
  try {
    // User must be logged in to link their account.
    if (!req.user || !req.user?._id) {
      return res.status(401).json({
        success: false,
        message: "You must be logged in to connect your Instagram account.",
      });
    }

    if (!INSTAGRAM_CLIENT_ID || !INSTAGRAM_REDIRECT_URI) {
      return res.status(500).json({
        success: false,
        message: "Instagram OAuth environment variables are missing.",
      });
    }
    const state = jwt.sign({ id: req.user?._id }, JWT_SECRET, {
      expiresIn: "10m",
    });

    const scopes = [
      "instagram_business_basic",
      "instagram_business_manage_messages",
      "instagram_business_manage_comments",
      "instagram_business_content_publish",
      "instagram_business_manage_insights",
    ].join(",");

    const authUrl = `https://www.instagram.com/oauth/authorize?force_reauth=true&client_id=${INSTAGRAM_CLIENT_ID}&redirect_uri=${INSTAGRAM_REDIRECT_URI}&response_type=code&scope=${encodeURIComponent(
      scopes
    )}&state=${state}`;

    return res.redirect(authUrl);
  } catch (err) {
    console.error("Instagram login redirect error:", err.message);
    res.status(500).json({
      success: false,
      message: "Failed to redirect to Instagram login.",
    });
  }
};

export const instagramCallback = async (req, res) => {
  const { code, state } = req.query;

  if (!code) return res.redirect(`${CLIENT_URL}/profile?error=no_code`);
  if (!state) return res.redirect(`${CLIENT_URL}/profile?error=no_state`);

  try {
    // 1. Verify the state token to get the logged-in user's ID
    const decodedState = jwt.verify(state, JWT_SECRET);
    const userId = decodedState.id;

    if (!userId) {
      throw new Error("Invalid state token: User ID missing.");
    }

    // console.log("Instagram callback received with code:", code);

    const shortTokenResponse = await axios.post(
      "https://api.instagram.com/oauth/access_token",
      new URLSearchParams({
        client_id: INSTAGRAM_CLIENT_ID,
        client_secret: INSTAGRAM_CLIENT_SECRET,
        grant_type: "authorization_code",
        redirect_uri: INSTAGRAM_REDIRECT_URI,
        code,
      })
    );

    const shortLivedToken = shortTokenResponse.data.access_token;
    if (!shortLivedToken)
      throw new Error("Failed to obtain short-lived token.");

    const longTokenResponse = await axios.get(
      "https://graph.instagram.com/access_token",
      {
        params: {
          grant_type: "ig_exchange_token",
          client_secret: INSTAGRAM_CLIENT_SECRET,
          access_token: shortLivedToken,
        },
      }
    );

    const longLivedToken = longTokenResponse.data.access_token;
    if (!longLivedToken) throw new Error("Failed to obtain long-lived token.");

    const userResponse = await axios.get(
      "https://graph.instagram.com/v24.0/me",
      {
        params: {
          fields: "id,username",
          access_token: longLivedToken,
        },
      }
    );

    const { id: ig_user_id } = userResponse.data;
    if (!ig_user_id) throw new Error("Instagram user data missing.");

    const user = await User.findById(userId);
    if (!user) {
      throw new Error("User not found.");
    }

    // 3. Update the user document with the new Instagram tokens
    user.instagramTokens = {
      access_token: longLivedToken,
      token_type: "Bearer",
      long_lived_token: longLivedToken,
      ig_user_id,
      long_lived_expires_in: 5184000, // Typically 60 days
    };

    await user.save();

    // const userData = {
    //   name: username,
    //   email: `${ig_user_id}@instagram.com`,
    //   instagramTokens: {
    //     access_token: longLivedToken,
    //     token_type: "Bearer",
    //     long_lived_token: longLivedToken,
    //     ig_user_id,
    //     long_lived_expires_in: 5184000,
    //   },
    // };

    // let user = await User.findOne({ "instagramTokens.ig_user_id": ig_user_id });
    // user = user ? Object.assign(user, userData) : await User.create(userData);
    // await user.save();

    // const payload = { id: user._id, email: user.email };
    // const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" });
    // const refreshToken = jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });

    // res.cookie("access_token", accessToken, {
    //   httpOnly: true,
    //   secure: NODE_ENV === "production",
    //   sameSite: "lax",
    // });

    return res.redirect(`${CLIENT_URL}?auth=success`);
  } catch (error) {
    console.error(
      "Instagram OAuth error:",
      error.response?.data || error.message
    );
    return res.redirect(`${CLIENT_URL}/login?error=instagram_auth_failed`);
  }
};



export const checkInstagramStatus = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated.",
      });
    }

    const user = await User.findById(req.user._id).select("instagramTokens");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    const isConnected =
      user.instagramTokens &&
      user.instagramTokens.access_token &&
      user.instagramTokens.ig_user_id;

    if (!isConnected) {
      return res.json({
        success: true,
        connected: false,
      });
    }

    let username = "";
    try {
      const igRes = await axios.get("https://graph.instagram.com/me", {
        params: {
          fields: "username",
          access_token: user.instagramTokens.access_token,
        },
      });

      username = igRes.data.username || "";
    } catch (err) {
      console.warn("Failed to fetch Instagram username:", err.message);
    }

    return res.json({
      success: true,
      connected: true,
      username,
    });
  } catch (error) {
    console.error("Error checking Instagram status:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to check Instagram connection.",
    });
  }
};



export const instagramLogout = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated.",
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    if (!user.instagramTokens || !user.instagramTokens.access_token) {
      return res.status(400).json({
        success: false,
        message: "No Instagram account connected.",
      });
    }

    user.instagramTokens = undefined;
    await user.save();

    return res.json({
      success: true,
      message: "Instagram account disconnected successfully.",
    });
  } catch (error) {
    console.error("Error disconnecting Instagram:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to disconnect Instagram account.",
    });
  }
};
