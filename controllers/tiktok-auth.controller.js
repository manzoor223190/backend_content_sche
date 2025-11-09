import axios from "axios";
import jwt from "jsonwebtoken";
import qs from "qs";
import { User } from "../models/User.js";

const {
  TIKTOK_CLIENT_KEY,
  TIKTOK_CLIENT_SECRET,
  TIKTOK_REDIRECT_URI,
  CLIENT_URL,
  JWT_SECRET,
  NODE_ENV,
} = process.env;

export const tiktokLogin = async (req, res) => {
  try {
    if (!req.user || !req.user?._id) {
      return res.status(401).json({
        success: false,
        message: "You must be logged in to connect your TikTok account.",
      });
    }

    const state = jwt.sign({ id: req.user._id }, JWT_SECRET, {
      expiresIn: "10m",
    });

    const params = new URLSearchParams({
      client_key: TIKTOK_CLIENT_KEY,
      response_type: "code",
      scope: "user.info.basic,video.upload,video.publish",
      redirect_uri: TIKTOK_REDIRECT_URI,
      state,
    });

    const authUrl = `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`;
    return res.redirect(authUrl);
  } catch (err) {
    console.error("TikTok login redirect error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Failed to initiate TikTok login.",
    });
  }
};

export const tiktokCallback = async (req, res) => {
  const { code, state } = req.query;

  if (!code) return res.redirect(`${CLIENT_URL}/profile?error=no_code`);
  if (!state) return res.redirect(`${CLIENT_URL}/profile?error=no_state`);

  try {
    const decoded = jwt.verify(state, JWT_SECRET);
    const userId = decoded.id;

    if (!userId) throw new Error("Invalid state token: User ID missing.");

    const tokenResponse = await axios.post(
      "https://open.tiktokapis.com/v2/oauth/token/",
      qs.stringify({
        client_key: TIKTOK_CLIENT_KEY,
        client_secret: TIKTOK_CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
        redirect_uri: TIKTOK_REDIRECT_URI,
      }),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }
    );

    const tokens = tokenResponse.data;
    console.log("TikTok tokens received:", tokens);

    const user = await User.findById(userId);
    if (!user) throw new Error("User not found.");

    user.tiktokTokens = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_in: tokens.expires_in,
      open_id: tokens.open_id,
    };

    await user.save();

    return res.redirect(`${CLIENT_URL}?tiktok=connected`);
  } catch (err) {
    console.error("TikTok OAuth Error:", err.response?.data || err.message);
    return res.redirect(`${CLIENT_URL}/profile?error=tiktok_auth_failed`);
  }
};




export const checkTiktokStatus = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated.",
      });
    }

    const user = await User.findById(req.user._id).select("tiktokTokens");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    const isConnected =
      user.tiktokTokens &&
      user.tiktokTokens.access_token &&
      user.tiktokTokens.open_id;

    if (!isConnected) {
      return res.json({
        success: true,
        connected: false,
      });
    }

    let username = "";
    try {
      const response = await axios.get(
        "https://open.tiktokapis.com/v2/user/info/",
        {
          headers: {
            Authorization: `Bearer ${user.tiktokTokens.access_token}`,
            "Content-Type": "application/json",
          },
          params: {
            fields: "open_id,display_name",
          },
        }
      );

      
      username = response.data.data?.user?.display_name || "";
    } catch (err) {
      
      console.warn("Failed to fetch TikTok username:", err.message);
    }

    return res.json({
      success: true,
      connected: true,
      username,
    });
  } catch (error) {
    console.error("Error checking TikTok status:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to check TikTok connection.",
    });
  }
};

export const tiktokLogout = async (req, res) => {
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

    if (!user.tiktokTokens || !user.tiktokTokens.access_token) {
      return res.status(400).json({
        success: false,
        message: "No TikTok account connected.",
      });
    }

    // Optionally: revoke TikTok token via API
    try {
      await axios.post(
        "https://open.tiktokapis.com/v2/oauth/revoke/",
        qs.stringify({
          client_key: TIKTOK_CLIENT_KEY,
          client_secret: TIKTOK_CLIENT_SECRET,
          token: user.tiktokTokens.access_token,
        }),
        {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        }
      );
    } catch (revokeErr) {
      console.warn("TikTok revoke failed (ignored):", revokeErr.message);
    }

    // Clear TikTok tokens from user
    user.tiktokTokens = undefined;
    await user.save();

    return res.json({
      success: true,
      message: "TikTok account disconnected successfully.",
    });
  } catch (error) {
    console.error("Error disconnecting TikTok:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to disconnect TikTok account.",
    });
  }
};
