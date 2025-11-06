import { Worker } from "bullmq";
import type IORedis from "ioredis";
import { resolveMarket } from "../services/marketService.js";
import { logger } from "../lib/logger.js";

export const registerPayoutWorker = (connection: IORedis.Redis) => {
  const worker = new Worker(
    "payouts",
    async (job) => {
      logger.info({ jobId: job.id, data: job.data }, "Processing payout job");
      await resolveMarket(job.data.marketId, job.data.adminId ?? "system", job.data.outcome);
    },
    { connection }
  );

  worker.on("error", (err) => {
    logger.error({ err }, "Payout worker error");
  });

  return worker;
};
