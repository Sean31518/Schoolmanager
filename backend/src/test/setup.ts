import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(__dirname, "../..");

process.env.NODE_ENV = "test";
process.env.DATABASE_URL = "file:./test.db";
process.env.JWT_ACCESS_SECRET = "test-access-secret-not-for-prod";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret-not-for-prod";
process.env.JWT_ACCESS_EXPIRES_IN = "15m";
process.env.JWT_REFRESH_EXPIRES_IN = "30d";
process.env.ALLOW_REGISTRATION = "true";
process.env.COOKIE_SECURE = "false";
process.env.PORT = "0";
// Reused from backend/.env (both are dev-only, gitignored) - a validly
// formatted key pair is required just to make webpush.setVapidDetails not
// throw at module load; no real push service is ever contacted in tests
// with a fake subscription endpoint.
process.env.VAPID_PUBLIC_KEY =
  "BAWxREGjpMX_D78Ipug0aRCccseJwLjQeSSMcvECYUY2gNxYQKJYV1J57jUvXjZnGc-A7WB8q0OV_YDQeEhDaMQ";
process.env.VAPID_PRIVATE_KEY = "5h615EPTlEhD7mPOGeuCYDwQzBGrvHD9Y4zl19Jp7ic";
process.env.VAPID_SUBJECT = "mailto:admin@example.com";
process.env.CREDENTIALS_ENCRYPTION_KEY =
  "ad44a99656017d08c47a556e009dce1c196513b3acbdfc95fd86314a1e2a1636";

execSync("npx prisma migrate deploy", {
  cwd: backendRoot,
  env: process.env,
  stdio: "inherit",
});
