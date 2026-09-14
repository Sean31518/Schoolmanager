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

execSync("npx prisma migrate deploy", {
  cwd: backendRoot,
  env: process.env,
  stdio: "inherit",
});
