import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().default(6666),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("30d"),
  ALLOW_REGISTRATION: z
    .string()
    .default("true")
    .transform((v) => v === "true"),
  COOKIE_SECURE: z
    .string()
    .default("false")
    .transform((v) => v === "true"),
});

export const env = envSchema.parse(process.env);
