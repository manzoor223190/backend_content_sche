import express from 'express';

import { verifyToken } from '../middleware/verifyToken.js';
import { publishVideoToTikTok } from '../controllers/tiktok-publish.controller.js';

const router = express.Router();


router.post('/tiktok/publish', verifyToken, publishVideoToTikTok);

export default router;