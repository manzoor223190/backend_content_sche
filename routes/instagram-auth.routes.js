import express from "express";
import { instagramLogin, instagramCallback, checkInstagramStatus, instagramLogout } from "../controllers/instagram-auth.controller.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();

router.get("/auth/instagram", verifyToken, instagramLogin);
router.get("/auth/instagram/callback", instagramCallback);
router.get("/auth/instagram/callback", instagramCallback);
router.get("/auth/instagram/status", verifyToken, checkInstagramStatus);
router.post("/auth/instagram/logout", verifyToken, instagramLogout);

export default router;
