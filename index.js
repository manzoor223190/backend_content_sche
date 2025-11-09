import "dotenv/config";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import { connectDB } from "./config/db.js";
import googleAuthRouter from "./routes/google-auth.route.js";
import tiktokAuthRouter from "./routes/tiktok-auth.routes.js";
import instagramAuthRoutes from "./routes/instagram-auth.routes.js";
import instagramPublishRoutes from "./routes/instagram-publish.routes.js";
import tiktokPublishRoutes from "./routes/tiktok-publish.routes.js";
import  scheduleRoutes from "./routes/schedule.routes.js";
import session from "express-session";
import passport from "passport";
import "./config/passport.js";
import cookieParser from "cookie-parser";
import { google } from "googleapis";
import { User } from "./models/User.js";

async function bootstrap() {
  const app = express();
 
  app.use(cors({
  origin: 'http://localhost:8080', // Frontend ka URL
  credentials: true, // IMPORTANT - cookies ke liye
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  exposedHeaders: ['Set-Cookie'],
  maxAge: 86400 // 24 hours
}));
  app.use(express.json({ limit: "10mb" }));
  app.use(morgan("dev"));
  app.use(
    session({ secret: "secret", resave: false, saveUninitialized: false })
  );
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(cookieParser());

  app.use((err, req, res, next) => {
    console.error("[error]", err);
    const status = err.status || 500;
    res.status(status).json({
      error: err.message || "Internal Server Error",
      details: err.details || undefined,
    });
  });

  app.get("/api/health", (req, res) => res.json({ ok: true }));

  app.use("/api/v1", googleAuthRouter);
  app.use("/api/v1", tiktokAuthRouter);
  app.use("/api/v1", instagramPublishRoutes);
  app.use("/api/v1", instagramAuthRoutes);
  app.use("/api/v1", tiktokPublishRoutes);
  app.use("/api/v1/", scheduleRoutes);
  app.get("/proxy/video/:userId/:fileId", async (req, res) => {
    const { fileId, userId } = req.params;

    const user = await User.findById(userId);
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    oauth2Client.setCredentials(user.googleTokens);

    const drive = google.drive({ version: "v3", auth: oauth2Client });
    const file = await drive.files.get(
      { fileId, alt: "media" },
      { responseType: "stream" }
    );

    res.setHeader("Content-Type", "video/mp4");
    file.data.pipe(res);
  });

  const port = Number(process.env.PORT || 5000);
  await connectDB();

  app.listen(port, () => {
    console.log(`[server] listening on http://localhost:${port}`);
  });
}

bootstrap().catch((err) => {
  console.error("[server] fatal error:", err);
  process.exit(1);
});
