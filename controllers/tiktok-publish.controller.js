// import axios from "axios";
// import { google } from "googleapis";
// import { User } from "../models/User.js";

// export const publishVideoToTikTok = async (req, res) => {
//   try {
//     const { fileId, videoUrl, caption } = req.body;

//     if (!fileId && !videoUrl)
//       return res
//         .status(400)
//         .json({ success: false, message: "Either fileId or videoUrl is required" });

//     const user = await User.findById(req.user._id);
//     if (!user)
//       return res
//         .status(404)
//         .json({ success: false, message: "User not found" });

//     const accessToken = user.tiktokTokens?.access_token;
//     if (!accessToken)
//       return res
//         .status(400)
//         .json({ success: false, message: "TikTok not connected" });

//     let videoStream;
//     let fileSize;
//     let fileName;

//     if (fileId) {
//       //  Google Drive Video 
//       const googleToken = user.googleTokens?.access_token;
//       if (!googleToken)
//         return res
//           .status(400)
//           .json({ success: false, message: "Google Drive not connected" });

//       const oauth2Client = new google.auth.OAuth2(
//         process.env.GOOGLE_CLIENT_ID,
//         process.env.GOOGLE_CLIENT_SECRET
//       );
//       oauth2Client.setCredentials(user.googleTokens);
//       const drive = google.drive({ version: "v3", auth: oauth2Client });

//       const fileMetadata = await drive.files.get({ fileId, fields: "size,name" });
//       fileSize = parseInt(fileMetadata.data.size, 10);
//       fileName = fileMetadata.data.name;

//       const driveResponse = await drive.files.get(
//         { fileId, alt: "media" },
//         { responseType: "stream" }
//       );

//       videoStream = driveResponse.data;
//     } else if (videoUrl) {
//       // Cloudinary / Direct Video URL
//       const videoResponse = await axios.get(videoUrl, {
//         responseType: "stream",
//         validateStatus: () => true,
//       });

//       if (videoResponse.status >= 400)
//         throw new Error(`Failed to fetch video from URL: ${videoResponse.status}`);

//       const contentLength = videoResponse.headers["content-length"];
//       fileSize = parseInt(contentLength, 10) || 0;
//       fileName = videoUrl.split("/").pop();
//       videoStream = videoResponse.data;
//     }

//     //=TikTok Upload Flow
//     const privacyRes = await axios.post(
//       "https://open.tiktokapis.com/v2/post/publish/creator_info/query/",
//       {},
//       { headers: { Authorization: `Bearer ${accessToken}` } }
//     );

//     const allowed = privacyRes.data?.data?.privacy_level_options || [];
//     const chosenPrivacy = allowed.includes("SELF_ONLY")
//       ? "SELF_ONLY"
//       : allowed[0];

//     const initRes = await axios.post(
//       "https://open.tiktokapis.com/v2/post/publish/video/init/",
//       {
//         post_info: {
//           title: caption || `Uploaded from ${fileId ? "Drive" : "URL"}: ${fileName}`,
//           privacy_level: chosenPrivacy,
//         },
//         source_info: {
//           source: "FILE_UPLOAD",
//           video_size: fileSize,
//           chunk_size: fileSize,
//           total_chunk_count: 1,
//         },
//       },
//       { headers: { Authorization: `Bearer ${accessToken}` } }
//     );

//     const uploadUrl = initRes.data?.data?.upload_url;
//     const uploadId = new URLSearchParams(new URL(uploadUrl).search).get("upload_id");
//     const uploadToken = new URLSearchParams(new URL(uploadUrl).search).get("upload_token");
//     const publishId = initRes.data?.data?.publish_id;

//     if (!uploadUrl || !uploadId || !uploadToken || !publishId)
//       throw new Error("Failed to get valid upload URL or tokens from TikTok init.");

//     const uploadResponse = await axios.put(uploadUrl, videoStream, {
//       headers: {
//         Authorization: `Bearer ${accessToken}`,
//         UploadId: uploadId,
//         UploadToken: uploadToken,
//         "Content-Type": "video/mp4",
//         "Content-Length": fileSize,
//         "Content-Range": `bytes 0-${fileSize - 1}/${fileSize}`,
//       },
//       maxBodyLength: Infinity,
//       maxContentLength: Infinity,
//       validateStatus: () => true,
//     });

//     if (uploadResponse.status >= 400)
//       throw new Error(`Upload failed with status ${uploadResponse.status}`);

//     const statusRes = await axios.post(
//       "https://open.tiktokapis.com/v2/post/publish/status/fetch/",
//       { publish_id: publishId },
//       {
//         headers: {
//           Authorization: `Bearer ${accessToken}`,
//           "Content-Type": "application/json; charset=UTF-8",
//         },
//       }
//     );

//     res.json({
//       success: true,
//       message: "Video uploaded and processing status fetched successfully",
//       data: statusRes.data,
//     });
//   } catch (err) {
//     console.error("TikTok upload error:", err.response?.data || err.message);
//     res.status(500).json({
//       success: false,
//       message: "TikTok upload failed",
//       error: err.response?.data || err.message,
//     });
//   }
// };









import axios from "axios";
import { google } from "googleapis";
import { User } from "../models/User.js";
import { Published } from "../models/Published.js";

export const publishVideoToTikTok = async (req, res) => {
  try {
    const { fileId, videoUrl, caption } = req.body;

    if (!fileId && !videoUrl)
      return res
        .status(400)
        .json({ success: false, message: "Either fileId or videoUrl is required" });

    const user = await User.findById(req.user._id);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    const accessToken = user.tiktokTokens?.access_token;
    if (!accessToken)
      return res
        .status(400)
        .json({ success: false, message: "TikTok not connected" });

    let videoStream;
    let fileSize;
    let fileName;

    if (fileId) {
      //  Google Drive Video 
      const googleToken = user.googleTokens?.access_token;
      if (!googleToken)
        return res
          .status(400)
          .json({ success: false, message: "Google Drive not connected" });

      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET
      );
      oauth2Client.setCredentials(user.googleTokens);
      const drive = google.drive({ version: "v3", auth: oauth2Client });

      const fileMetadata = await drive.files.get({ fileId, fields: "size,name" });
      fileSize = parseInt(fileMetadata.data.size, 10);
      fileName = fileMetadata.data.name;

      const driveResponse = await drive.files.get(
        { fileId, alt: "media" },
        { responseType: "stream" }
      );

      videoStream = driveResponse.data;
    } else if (videoUrl) {
      // Cloudinary / Direct Video URL
      const videoResponse = await axios.get(videoUrl, {
        responseType: "stream",
        validateStatus: () => true,
      });

      if (videoResponse.status >= 400)
        throw new Error(`Failed to fetch video from URL: ${videoResponse.status}`);

      const contentLength = videoResponse.headers["content-length"];
      fileSize = parseInt(contentLength, 10) || 0;
      fileName = videoUrl.split("/").pop();
      videoStream = videoResponse.data;
    }

    //=TikTok Upload Flow
    const privacyRes = await axios.post(
      "https://open.tiktokapis.com/v2/post/publish/creator_info/query/",
      {},
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    const allowed = privacyRes.data?.data?.privacy_level_options || [];
    const chosenPrivacy = allowed.includes("SELF_ONLY")
      ? "SELF_ONLY"
      : allowed[0];

    const initRes = await axios.post(
      "https://open.tiktokapis.com/v2/post/publish/video/init/",
      {
        post_info: {
          title: caption || `Uploaded from ${fileId ? "Drive" : "URL"}: ${fileName}`,
          privacy_level: chosenPrivacy,
        },
        source_info: {
          source: "FILE_UPLOAD",
          video_size: fileSize,
          chunk_size: fileSize,
          total_chunk_count: 1,
        },
      },
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    const uploadUrl = initRes.data?.data?.upload_url;
    const uploadId = new URLSearchParams(new URL(uploadUrl).search).get("upload_id");
    const uploadToken = new URLSearchParams(new URL(uploadUrl).search).get("upload_token");
    const publishId = initRes.data?.data?.publish_id;

    if (!uploadUrl || !uploadId || !uploadToken || !publishId)
      throw new Error("Failed to get valid upload URL or tokens from TikTok init.");

    const uploadResponse = await axios.put(uploadUrl, videoStream, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        UploadId: uploadId,
        UploadToken: uploadToken,
        "Content-Type": "video/mp4",
        "Content-Length": fileSize,
        "Content-Range": `bytes 0-${fileSize - 1}/${fileSize}`,
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
      validateStatus: () => true,
    });

    if (uploadResponse.status >= 400)
      throw new Error(`Upload failed with status ${uploadResponse.status}`);

    const statusRes = await axios.post(
      "https://open.tiktokapis.com/v2/post/publish/status/fetch/",
      { publish_id: publishId },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json; charset=UTF-8",
        },
      }
    );

    // Save to Published schema if fileId exists
    if (fileId) {
      try {
        await Published.findOneAndUpdate(
          { user: req.user._id, fileId },
          {
            user: req.user._id,
            fileId,
            caption: caption || `Uploaded from Drive: ${fileName}`,
            platforms: ["tiktok"],
            publishedAt: new Date(),
            $set: {
              "status.tiktok": "posted",
              "responses.tiktok": statusRes.data
            }
          },
          { upsert: true, new: true }
        );
        console.log(`✅ Saved fileId ${fileId} to Published schema (TikTok)`);
      } catch (dbError) {
        console.error("Failed to save to Published schema:", dbError.message);
      }
    }

    res.json({
      success: true,
      message: "Video uploaded and processing status fetched successfully",
      data: statusRes.data,
    });
  } catch (err) {
    console.error("TikTok upload error:", err.response?.data || err.message);
    res.status(500).json({
      success: false,
      message: "TikTok upload failed",
      error: err.response?.data || err.message,
    });
  }
};
