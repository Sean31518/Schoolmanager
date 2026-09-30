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
  // Server-wide secret used to encrypt per-user third-party credentials at
  // rest (currently: IServ login for Vertretungsplan sync). Not the
  // credential itself - those are per-user, stored in Settings. Feature is
  // silently disabled (like push) when this isn't set. Generate with:
  // openssl rand -hex 32
  CREDENTIALS_ENCRYPTION_KEY: z.string().optional(),
  // Goodnotes Auto-Backup target. A separate plain-HTTP listener at the
  // root path; HTTPS and the home-network restriction come from the
  // reverse proxy in front of it. 0 turns it off. DAV_PUBLIC_URL is only
  // shown in the settings so the user knows what to type into Goodnotes.
  DAV_PORT: z.coerce.number().default(6970),
  DAV_PUBLIC_URL: z.string().optional(),
  DAV_MAX_UPLOAD_MB: z.coerce.number().default(1024),
});

export const env = envSchema.parse(process.env);
