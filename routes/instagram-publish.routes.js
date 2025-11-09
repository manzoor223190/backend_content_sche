import express from 'express';
import { publishVideoToInstagram } from '../controllers/instagram-publish.controller.js';
import { verifyToken } from '../middleware/verifyToken.js';

const router = express.Router();


router.post('/instagram/publish', verifyToken, publishVideoToInstagram);

export default router;