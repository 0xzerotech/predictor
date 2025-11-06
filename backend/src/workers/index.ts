import { Queue, QueueScheduler } from "bullmq";
import IORedis from "ioredis";
import { env } from "../config/index.js";
import { logger } from "../lib/logger.js";
import { registerPayoutWorker } from "./payoutWorker.js";

const connection = new IORedis(env.REDIS_URL);

export const payoutQueue = new Queue("payouts", { connection });
const scheduler = new QueueScheduler("payouts", { connection });

export const initBackgroundWorkers = async () => {
  await scheduler.waitUntilReady();
  registerPayoutWorker(connection);
  logger.info("Background workers initialized");
};

export const enqueuePayoutJob = async (data: { marketId: string; outcome: string }) => {
  await payoutQueue.add("market-resolution", data, { removeOnComplete: true, removeOnFail: true });
};
