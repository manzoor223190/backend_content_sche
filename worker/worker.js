import { Worker } from "bullmq";
import { connection } from "../config/bullmq.js";
import { publishVideoToTikTok } from "../controllers/tiktok-publish.controller.js";
import { publishVideoToInstagram } from "../controllers/instagram-publish.controller.js";
import { SocialSchedule } from "../models/ScheduledPost.js";
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

mongoose
  .connect(MONGODB_URI)
  .then(() => console.log("MongoDB connected in worker"))
  .catch((err) => console.error(" MongoDB connection failed in worker:", err));

const worker = new Worker(
  "social-post-queue",
  async (job) => {
    console.log(` Running job ${job.id} for platform(s):`, job.data.platform);

    const { platform, body, user, scheduleId } = job.data;

    const mockReq = { body, user };
    
    // Track responses for each platform
    const platformResults = {};

    const mockRes = {
      status: (code) => ({
        json: (payload) => {
          console.log("Response:", code, payload);
          return payload;
        },
      }),
      json: (payload) => {
        console.log("Response:", payload);
        return payload;
      },
    };

    const platforms = Array.isArray(platform) ? platform : [platform];

    for (const platformName of platforms) {
      try {
        console.log(` Processing ${platformName} post...`);

        // Update status to "uploading" in DB
        if (scheduleId) {
          await SocialSchedule.findByIdAndUpdate(scheduleId, {
            [`status.${platformName}`]: "uploading"
          });
          console.log(`📤 Updated ${platformName} status to "uploading" in DB`);
        }

        let response;
        if (platformName === "tiktok") {
          response = await publishVideoToTikTok(mockReq, mockRes);
        } else if (platformName === "instagram") {
          response = await publishVideoToInstagram(mockReq, mockRes);
        } else {
          console.warn(` Unknown platform: ${platformName}`);
          
          // Update status to "failed" for unknown platform
          if (scheduleId) {
            await SocialSchedule.findByIdAndUpdate(scheduleId, {
              [`status.${platformName}`]: "failed",
              [`responses.${platformName}`]: { error: "Unknown platform" }
            });
          }
          continue;
        }

        // Update status to "posted" in DB
        if (scheduleId) {
          await SocialSchedule.findByIdAndUpdate(scheduleId, {
            [`status.${platformName}`]: "posted",
            [`responses.${platformName}`]: response || { success: true }
          });
          console.log(`✅ Updated ${platformName} status to "posted" in DB`);
        }

        platformResults[platformName] = { success: true, response };
        console.log(` ${platformName} post processed successfully`);
      } catch (err) {
        console.error(` Failed to process ${platformName} post:`, err.message);
        
        // Update status to "failed" in DB
        if (scheduleId) {
          await SocialSchedule.findByIdAndUpdate(scheduleId, {
            [`status.${platformName}`]: "failed",
            [`responses.${platformName}`]: { error: err.message, stack: err.stack }
          });
          console.log(`❌ Updated ${platformName} status to "failed" in DB`);
        }

        platformResults[platformName] = { success: false, error: err.message };
      }
    }

    return platformResults;
  },
  { connection }
);

worker.on("completed", (job) =>
  console.log(` Job ${job.id} completed successfully`)
);
worker.on("failed", (job, err) =>
  console.error(` Job ${job.id} failed:`, err.message)
);
