// import { postQueue } from "../config/bullmq.js";
// import { User } from "../models/User.js";

// const schedulePost = async (req, res) => {
//   try {
//     const { platform, fileId, videoUrl, caption, scheduledTime } = req.body;
//     const user = await User.findById(req.user._id);

//     if (!user) {
//       return res.status(404).json({ success: false, message: "User not found" });
//     }

//     if (!platform) {
//       return res.status(400).json({ success: false, message: "Platform is required" });
//     }


//     if (!Array.isArray(platform) || platform.length === 0) {
//       return res.status(400).json({
//         success: false,
//         message: "Platform must be a non-empty array (e.g. ['instagram', 'tiktok']).",
//       });
//     }
    
//     if (!caption) {
//       return res.status(400).json({ success: false, message: "Caption is required" });
//     }

//     if (!fileId && !videoUrl) {
//       return res.status(400).json({
//         success: false,
//         message: "Either fileId (Google Drive) or videoUrl (Cloudinary) must be provided",
//       });
//     }

//     if (!scheduledTime) {
//       return res.status(400).json({ success: false, message: "Scheduled time is required" });
//     }

//     const delay = new Date(scheduledTime) - Date.now();
//     if (delay <= 0) {
//       return res.status(400).json({ success: false, message: "Invalid schedule time" });
//     }

//     // Add job to queue
//     const job = await postQueue.add(
//       "publishPost",
//       {
//         platform,
//         body: { fileId, videoUrl, caption },
//         user,
//       },
//       { delay }
//     );

//     res.json({
//       success: true,
//       message: `Post scheduled successfully for ${platform}`,
//       jobId: job.id,
//       scheduledFor: scheduledTime,
//     });
//   } catch (err) {
//     console.error("Error scheduling post:", err);
//     res.status(500).json({ success: false, message: "Failed to schedule post" });
//   }
// };

// export { schedulePost };












import { postQueue } from "../config/bullmq.js";
import { User } from "../models/User.js";
import { SocialSchedule } from "../models/ScheduledPost.js";

const schedulePost = async (req, res) => {
  try {
    const { platform, fileId, videoUrl, caption, scheduledTime } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (!platform) {
      return res.status(400).json({ success: false, message: "Platform is required" });
    }


    if (!Array.isArray(platform) || platform.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Platform must be a non-empty array (e.g. ['instagram', 'tiktok']).",
      });
    }
    
    if (!caption) {
      return res.status(400).json({ success: false, message: "Caption is required" });
    }

    if (!fileId && !videoUrl) {
      return res.status(400).json({
        success: false,
        message: "Either fileId (Google Drive) or videoUrl (Cloudinary) must be provided",
      });
    }

    if (!scheduledTime) {
      return res.status(400).json({ success: false, message: "Scheduled time is required" });
    }

    const delay = new Date(scheduledTime) - Date.now();
    if (delay <= 0) {
      return res.status(400).json({ success: false, message: "Invalid schedule time" });
    }

    // Create initial status object for each platform
    const statusObj = {};
    platform.forEach(p => {
      statusObj[p] = "pending";
    });

    // Save schedule to MongoDB
    const newSchedule = await SocialSchedule.create({
      user: user._id,
      fileId: fileId || videoUrl,
      caption,
      platforms: platform,
      scheduledTime: new Date(scheduledTime),
      status: statusObj,
      responses: {}
    });

    // Add job to queue
    const job = await postQueue.add(
      "publishPost",
      {
        platform,
        body: { fileId, videoUrl, caption },
        user,
        scheduleId: newSchedule._id,
      },
      { delay }
    );

    res.json({
      success: true,
      message: `Post scheduled successfully for ${platform}`,
      jobId: job.id,
      scheduleId: newSchedule._id,
      scheduledFor: scheduledTime,
    });
  } catch (err) {
    console.error("Error scheduling post:", err);
    res.status(500).json({ success: false, message: "Failed to schedule post" });
  }
};

// Get schedules by filter (all, pending, published, failed)
const getSchedulesByStatus = async (req, res) => {
  try {
    const userId = req.user._id;
    const { filter } = req.query; // ?filter=all|pending|published|failed

    let query = { user: userId };
    
    // Filter based on filter parameter
    if (filter === "published") {
      // At least one platform is posted
      query.$or = [
        { "status.tiktok": "posted" },
        { "status.instagram": "posted" }
      ];
    } else if (filter === "pending") {
      // All platforms are pending (not posted, not failed, not uploading)
      query.$and = [
        { $or: [{ "status.tiktok": "pending" }, { "status.tiktok": { $exists: false } }] },
        { $or: [{ "status.instagram": "pending" }, { "status.instagram": { $exists: false } }] }
      ];
    } else if (filter === "failed") {
      // At least one platform failed
      query.$or = [
        { "status.tiktok": "failed" },
        { "status.instagram": "failed" }
      ];
    }
    // If filter === "all" or no filter, return all schedules

    const schedules = await SocialSchedule.find(query)
      .sort({ scheduledTime: -1 })
      .populate("user", "name email");

    // Format the response
    const formattedSchedules = schedules.map(schedule => {
      // Determine overall status
      let overallStatus = "pending";
      
      const hasFailed = 
        schedule.status?.tiktok === "failed" || 
        schedule.status?.instagram === "failed";
      
      const hasPosted = 
        schedule.status?.tiktok === "posted" || 
        schedule.status?.instagram === "posted";
      
      const isUploading = 
        schedule.status?.tiktok === "uploading" || 
        schedule.status?.instagram === "uploading";
      
      if (hasFailed) {
        overallStatus = "failed";
      } else if (hasPosted) {
        overallStatus = "published";
      } else if (isUploading) {
        overallStatus = "uploading";
      }

      return {
        _id: schedule._id,
        user: schedule.user,
        fileId: schedule.fileId,
        caption: schedule.caption,
        platforms: schedule.platforms,
        scheduledTime: schedule.scheduledTime,
        createdAt: schedule.createdAt,
        updatedAt: schedule.updatedAt,
        status: overallStatus,
        platformStatus: schedule.status,
        responses: schedule.responses
      };
    });

    res.status(200).json({
      success: true,
      filter: filter || "all",
      count: formattedSchedules.length,
      schedules: formattedSchedules
    }); 
  } catch (err) {
    console.error("Error fetching schedules by filter:", err);
    res.status(500).json({ success: false, message: "Failed to fetch schedules" });
  }
};

export { schedulePost, getSchedulesByStatus };
