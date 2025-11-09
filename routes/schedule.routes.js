import express from "express";
import { getSchedulesByStatus, schedulePost } from "../controllers/scheduler.controller.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();

router.post("/schedule/post", verifyToken, schedulePost);
router.get("/schedule/post", verifyToken, getSchedulesByStatus);

export default router;
