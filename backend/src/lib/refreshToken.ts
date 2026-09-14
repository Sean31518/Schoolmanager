import { createHash, randomBytes } from "node:crypto";
import { env } from "../config/env.js";
import { parseDurationMs } from "./duration.js";

export function generateRefreshToken(): string {
  return randomBytes(32).toString("hex");
}

export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function refreshTokenMaxAgeMs(): number {
  return parseDurationMs(env.JWT_REFRESH_EXPIRES_IN);
}

export function refreshTokenExpiresAt(): Date {
  return new Date(Date.now() + refreshTokenMaxAgeMs());
}
