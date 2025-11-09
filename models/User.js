import mongoose from "mongoose"

const TokenSchema = new mongoose.Schema(
  {
    access_token: String,
    refresh_token: String,
    scope: String,
    token_type: String,
    expiry_date: Number, // for Google tokens (ms since epoch)
    // Instagram specifics
    long_lived_token: String,
    long_lived_expires_in: Number,
    ig_user_id: String,
    // TikTok specifics
    open_id: String,
    // add other fields as needed
  },
  { _id: false },
)

const UserSchema = new mongoose.Schema(
  {
    name: { type: String },
    email: { type: String, required: true, unique: true },
    googleTokens: { type: TokenSchema },
    instagramTokens: { type: TokenSchema },
    tiktokTokens: { type: TokenSchema },
  },
  { timestamps: true },
)

export const User = mongoose.models.User || mongoose.model("User", UserSchema)
