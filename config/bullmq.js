import IORedis from "ioredis";
import { Queue } from "bullmq";
import dotenv from "dotenv";

dotenv.config();
export const connection = new IORedis({
  username: "default",
  password: process.env.REDIS_PASSWORD,
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  maxRetriesPerRequest: null, 
});

export const postQueue = new Queue("social-post-queue", { connection });

console.log(" BullMQ Redis connection initialized");
