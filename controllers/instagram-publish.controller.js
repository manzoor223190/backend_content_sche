// import { google } from "googleapis";
// import axios from "axios";
// import { User } from "../models/User.js";
// import checkContainerStatus from "../utils/checkContainerSatus.js";

// export const publishVideoToInstagram = async (req, res) => {
//   const { fileId, videoUrl, caption } = req.body;
//   const userId = req.user?._id;

//   if (!userId) {
//     return res.status(401).json({ success: false, message: "Unauthorized." });
//   }

//   if (!caption) {
//     return res
//       .status(400)
//       .json({ success: false, message: "Caption is required." });
//   }

//   if (!fileId && !videoUrl) {
//     return res.status(400).json({
//       success: false,
//       message: "Either Google Drive fileId or videoUrl is required.",
//     });
//   }

//   try {
//     const user = await User.findById(userId);

//     if (
//       !user ||
//       !user.googleTokens?.access_token ||
//       !user.instagramTokens?.access_token
//     ) {
//       return res.status(400).json({
//         success: false,
//         message: "User has not connected both Google and Instagram accounts.",
//       });
//     }

//     const oauth2Client = new google.auth.OAuth2(
//       process.env.GOOGLE_CLIENT_ID,
//       process.env.GOOGLE_CLIENT_SECRET
//     );
//     oauth2Client.setCredentials(user.googleTokens);

//     const { access_token: igAccessToken, ig_user_id: igUserId } =
//       user.instagramTokens;

//     let finalVideoUrl = videoUrl;

//     // If Google Drive video is provided
//     if (fileId) {
//       if (!user.googleTokens?.access_token) {
//         return res
//           .status(400)
//           .json({ success: false, message: "Google Drive not connected." });
//       }

//       // Generate temporary proxy video URL for Instagram to access the file
//       finalVideoUrl = `${process.env.SERVER_URL}/proxy/video/${userId}/${fileId}`;
//     }

//     const containerUrl = `https://graph.instagram.com/v24.0/${igUserId}/media`;

//     console.log("Creating Instagram media container...");

//     const containerResponse = await axios.post(containerUrl, null, {
//       params: {
//         media_type: "REELS",
//         video_url: finalVideoUrl,
//         caption: caption,
//         access_token: igAccessToken,
//       },
//     });

//     const containerId = containerResponse.data.id;
//     if (!containerId)
//       throw new Error("Failed to create Instagram media container.");

//     let status = "";
//     while (status !== "FINISHED") {
//       console.log(`Checking container ${containerId} status...`);
//       status = await checkContainerStatus(containerId, igAccessToken);
//       if (status === "ERROR")
//         throw new Error("Instagram failed to process the video.");
//       await new Promise((resolve) => setTimeout(resolve, 5000));
//     }

//     console.log("Container is finished. Publishing video...");
//     const publishUrl = `https://graph.instagram.com/v24.0/${igUserId}/media_publish`;
//     const publishResponse = await axios.post(publishUrl, null, {
//       params: { creation_id: containerId, access_token: igAccessToken },
//     });

//     console.log("Video published successfully!");
//     res.status(200).json({ success: true, data: publishResponse.data });
//   } catch (error) {
//     const errorMessage = error.response?.data?.error?.message || error.message;
//     console.error("Failed to post to Instagram:", errorMessage);
//     res.status(500).json({ success: false, message: errorMessage });
//   }
// };














import { google } from "googleapis";
import axios from "axios";
import { User } from "../models/User.js";
import { Published } from "../models/Published.js";
import checkContainerStatus from "../utils/checkContainerSatus.js";

export const publishVideoToInstagram = async (req, res) => {
  const { fileId, videoUrl, caption } = req.body;
  const userId = req.user?._id;

  if (!userId) {
    return res.status(401).json({ success: false, message: "Unauthorized." });
  }

  if (!caption) {
    return res
      .status(400)
      .json({ success: false, message: "Caption is required." });
  }

  if (!fileId && !videoUrl) {
    return res.status(400).json({
      success: false,
      message: "Either Google Drive fileId or videoUrl is required.",
    });
  }

  try {
    const user = await User.findById(userId);

    if (
      !user ||
      !user.googleTokens?.access_token ||
      !user.instagramTokens?.access_token
    ) {
      return res.status(400).json({
        success: false,
        message: "User has not connected both Google and Instagram accounts.",
      });
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    oauth2Client.setCredentials(user.googleTokens);

    const { access_token: igAccessToken, ig_user_id: igUserId } =
      user.instagramTokens;

    let finalVideoUrl = videoUrl;

    // If Google Drive video is provided
    if (fileId) {
      if (!user.googleTokens?.access_token) {
        return res
          .status(400)
          .json({ success: false, message: "Google Drive not connected." });
      }

      // Generate temporary proxy video URL for Instagram to access the file
      finalVideoUrl = `${process.env.SERVER_URL}/proxy/video/${userId}/${fileId}`;
    }

    const containerUrl = `https://graph.instagram.com/v24.0/${igUserId}/media`;

    console.log("Creating Instagram media container...");

    const containerResponse = await axios.post(containerUrl, null, {
      params: {
        media_type: "REELS",
        video_url: finalVideoUrl,
        caption: caption,
        access_token: igAccessToken,
      },
    });

    const containerId = containerResponse.data.id;
    if (!containerId)
      throw new Error("Failed to create Instagram media container.");

    let status = "";
    while (status !== "FINISHED") {
      console.log(`Checking container ${containerId} status...`);
      status = await checkContainerStatus(containerId, igAccessToken);
      if (status === "ERROR")
        throw new Error("Instagram failed to process the video.");
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    console.log("Container is finished. Publishing video...");
    const publishUrl = `https://graph.instagram.com/v24.0/${igUserId}/media_publish`;
    const publishResponse = await axios.post(publishUrl, null, {
      params: { creation_id: containerId, access_token: igAccessToken },
    });

    console.log("Video published successfully!");

    // Save to Published schema if fileId exists
    if (fileId) {
      try {
        await Published.findOneAndUpdate(
          { user: userId, fileId },
          {
            user: userId,
            fileId,
            caption,
            platforms: ["instagram"],
            publishedAt: new Date(),
            $set: {
              "status.instagram": "posted",
              "responses.instagram": publishResponse.data
            }
          },
          { upsert: true, new: true }
        );
        console.log(`✅ Saved fileId ${fileId} to Published schema (Instagram)`);
      } catch (dbError) {
        console.error("Failed to save to Published schema:", dbError.message);
      }
    }

    res.status(200).json({ success: true, data: publishResponse.data });
  } catch (error) {
    const errorMessage = error.response?.data?.error?.message || error.message;
    console.error("Failed to post to Instagram:", errorMessage);
    res.status(500).json({ success: false, message: errorMessage });
  }
};
