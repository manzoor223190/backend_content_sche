import express from "express";
import {
  googleAuth,
  googleCallback,
  getCurrentUser,
  logout,
} from "../controllers/google-auth.controller.js";
import { listDriveFiles } from "../controllers/drive.controller.js";
import { verifyToken } from "../middleware/verifyToken.js"; 

const router = express.Router();

router.get("/auth/google", googleAuth);
router.get("/auth/google/callback", googleCallback);
router.get("/auth/me", verifyToken, getCurrentUser);
router.get("/auth/logout", logout);

// Google Drive routes
router.get("/drive/files", verifyToken, listDriveFiles);

export default router;
