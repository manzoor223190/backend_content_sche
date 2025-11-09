import mongoose from "mongoose";

const publishedSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  fileId: { 
    type: String, 
    required: true 
  },
  caption: { 
    type: String 
  },
  platforms: [{ 
    type: String, 
    enum: ["tiktok", "instagram"] 
  }],
  publishedAt: { 
    type: Date, 
    default: Date.now 
  },
  status: {
    tiktok: { 
      type: String, 
      enum: ["posted", "failed"] 
    },
    instagram: { 
      type: String, 
      enum: ["posted", "failed"] 
    }
  },
  responses: {
    tiktok: { type: Object },
    instagram: { type: Object }
  }
}, { timestamps: true });

// Index for quick lookups
publishedSchema.index({ user: 1, fileId: 1 });
publishedSchema.index({ user: 1, publishedAt: -1 });

export const Published = mongoose.model("Published", publishedSchema);
