import express from "express";
import { listDriveFiles } from "../controllers/drive.controller.js";
import { verifyToken } from "../middlewares/auth.js"; 

const router = express.Router();

// Google Drive routes
router.get("/drive/files", verifyToken, listDriveFiles);

export default router;
