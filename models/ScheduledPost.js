import mongoose from "mongoose";

const socialScheduleSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  fileId: { type: String, required: true },
  caption: { type: String },
  platforms: [{ type: String, enum: ["tiktok", "instagram"] }], 
  scheduledTime: { type: Date, required: true },
  status: { 
    tiktok: { type: String, enum: ["pending", "uploading", "posted", "failed"], default: "pending" },
    instagram: { type: String, enum: ["pending", "uploading", "posted", "failed"], default: "pending" }
  },
  responses: {
    tiktok: { type: Object },
    instagram: { type: Object }
  }
}, { timestamps: true });

export const SocialSchedule = mongoose.model("SocialSchedule", socialScheduleSchema);
