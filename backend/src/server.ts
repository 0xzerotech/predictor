import "express-async-errors";
import { createServer } from "http";
import { app } from "./app.js";
import { logger } from "./lib/logger.js";
import { env } from "./config/env.js";
import { initPrisma } from "./lib/prisma.js";
import { initRedis } from "./lib/redis.js";
import { initBackgroundWorkers } from "./workers/index.js";

async function main() {
  await initPrisma();
  await initRedis();
  await initBackgroundWorkers();

  const server = createServer(app);
  server.listen(env.PORT, () => {
    logger.info({ port: env.PORT }, "Server started");
  });
}

main().catch((error) => {
  logger.error({ err: error }, "Fatal error on startup");
  process.exit(1);
});
