import fs from "node:fs";
import path from "node:path";
import { env } from "../config/env.js";

export const uploadsDir = path.resolve(env.UPLOADS_DIR);

export function ensureUploadsDir() {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

export function absoluteUploadPath(storagePath: string) {
  return path.join(uploadsDir, storagePath);
}
