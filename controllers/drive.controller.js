import { google } from "googleapis";
import { User } from "../models/User.js";
import { Published } from "../models/Published.js";


export const listDriveFiles = async (req, res) => {
  try {
    const userId = req.user?._id || req.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const user = await User.findById(userId);
    if (!user || !user.googleTokens?.access_token) {
      return res.status(400).json({ success: false, message: "Google not connected" });
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    oauth2Client.setCredentials({
      access_token: user.googleTokens.access_token,
      refresh_token: user.googleTokens.refresh_token,
      expiry_date: user.googleTokens.expiry_date,
    });

    const drive = google.drive({ version: "v3", auth: oauth2Client });

    const response = await drive.files.list({
      q: "mimeType contains 'video/'",
      pageSize: 100, // Increase to get more files before filtering
      fields: "files(id, name, mimeType, webContentLink, thumbnailLink, createdTime)",
    });

    // Get all fileIds that have been published by this user
    const publishedPosts = await Published.find({ 
      user: userId,
      $or: [
        { "status.tiktok": "posted" },
        { "status.instagram": "posted" }
      ]
    }).select('fileId');

    const publishedFileIds = publishedPosts.map(post => post.fileId);

    // Filter out videos that have already been published
    const unpublishedVideos = response.data.files.filter(file => 
      !publishedFileIds.includes(file.id)
    );

    res.status(200).json({ 
      success: true, 
      files: unpublishedVideos,
      total: unpublishedVideos.length,
      totalDriveVideos: response.data.files.length,
      alreadyPublished: response.data.files.length - unpublishedVideos.length
    });
  } catch (err) {
    console.error("Drive API error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};
