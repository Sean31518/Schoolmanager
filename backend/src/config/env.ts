import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().default(6969),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  DATABASE_URL: z.string().min(1),
  UPLOADS_DIR: z.string().default("./uploads"),
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
  // Web Push reminders are disabled (silently, not an error) when these
  // aren't set - see modules/push/push.service.ts.
  VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  VAPID_SUBJECT: z.string().default("mailto:admin@example.com"),
});

export const env = envSchema.parse(process.env);
