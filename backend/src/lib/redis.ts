import { createClient, RedisClientType } from "redis";
import { env } from "../config/index.js";
import { logger } from "./logger.js";

let client: RedisClientType | null = null;

export const getRedis = () => {
  if (!client) {
    client = createClient({ url: env.REDIS_URL });
    client.on("error", (err) => logger.error({ err }, "Redis error"));
  }
  return client;
};

export const initRedis = async () => {
  const redis = getRedis();
  if (!redis.isOpen) {
    await redis.connect();
    logger.info("Connected to Redis");
  }
};

export const disconnectRedis = async () => {
  if (client && client.isOpen) {
    await client.disconnect();
  }
};
