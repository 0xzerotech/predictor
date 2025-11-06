import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  STRIPE_SECRET_KEY: z.string(),
  STRIPE_WEBHOOK_SECRET: z.string(),
  ADMIN_DEFAULT_EMAIL: z.string().email(),
  ADMIN_DEFAULT_PASSWORD: z.string().min(12),
  FRONTEND_ORIGIN: z.string(),
  LOG_LEVEL: z.string().default("info"),
  REDIS_URL: z.string().url(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables", parsed.error.flatten().fieldErrors);
  throw new Error("Failed to parse environment variables");
}

export const env = parsed.data;
