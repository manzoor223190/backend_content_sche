import express from "express";
import { checkTiktokStatus, tiktokCallback, tiktokLogin, tiktokLogout } from "../controllers/tiktok-auth.controller.js";
import { verifyToken } from "../middleware/verifyToken.js";


const router = express.Router();

router.get("/auth/tiktok",verifyToken, tiktokLogin);
router.get("/auth/tiktok/callback", tiktokCallback);
router.get("/auth/tiktok/status",verifyToken, checkTiktokStatus);
router.post("/auth/tiktok/logout",verifyToken ,tiktokLogout);

export default router;
    