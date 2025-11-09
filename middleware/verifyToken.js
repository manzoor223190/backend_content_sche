import jwt from "jsonwebtoken";
import { User } from "../models/User.js";

export const verifyToken = async (req, res, next) => {
  try {
    const token =
      req.cookies?.access_token ||
      req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res
        .status(401)
        .json({ success: false, message: "Access denied. No token provided." });
    }

    // 2️⃣ Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    

    // 3️⃣ Fetch user from DB (optional but recommended)
    const user = await User.findById(decoded.id).select("-__v");
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    }

    // 4️⃣ Attach user info to request
    req.user = user;
    req.userId = user._id;

    next();
  } catch (err) {
    console.error("JWT verification error:", err.message);
    return res.status(401).json({
      success: false,
      message:
        err.name === "TokenExpiredError"
          ? "Session expired. Please log in again."
          : "Invalid token.",
    });
  }
};
