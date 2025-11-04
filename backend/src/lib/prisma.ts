import { PrismaClient } from "@prisma/client";
import { env } from "../config/index.js";
import { logger } from "./logger.js";

let prisma: PrismaClient | null = null;

export const getPrisma = () => {
  if (!prisma) {
    prisma = new PrismaClient({
      log: env.NODE_ENV === "development" ? ["query", "warn", "error"] : ["warn", "error"],
    });
  }
  return prisma;
};

export const initPrisma = async () => {
  const client = getPrisma();
  await client.$connect();
  logger.info("Connected to PostgreSQL");
};

export const disconnectPrisma = async () => {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
  }
};
