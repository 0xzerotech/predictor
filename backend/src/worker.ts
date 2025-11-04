import { initPrisma } from "./lib/prisma.js";
import { initRedis } from "./lib/redis.js";
import { initBackgroundWorkers } from "./workers/index.js";
import { logger } from "./lib/logger.js";

async function main() {
  await initPrisma();
  await initRedis();
  await initBackgroundWorkers();

  logger.info("Worker process running");
}

main().catch((err) => {
  logger.error({ err }, "Worker failed");
  process.exit(1);
});
