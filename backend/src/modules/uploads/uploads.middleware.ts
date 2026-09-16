import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import multer, { type FileFilterCallback } from "multer";
import type { Request } from "express";
import { ValidationError } from "../../lib/errors.js";
import { uploadsDir } from "../../lib/storage.js";

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "video/mp4",
  "video/webm",
  "video/ogg",
  "video/quicktime",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/svg+xml",
]);

function fileFilter(_req: Request, file: Express.Multer.File, cb: FileFilterCallback) {
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    cb(new ValidationError(`Dateityp ${file.mimetype} wird nicht unterstützt`));
    return;
  }
  cb(null, true);
}

export const upload = multer({
  storage: multer.diskStorage({
    destination: (req, _file, cb) => {
      const dir = path.join(uploadsDir, req.user!.id);
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${crypto.randomUUID()}${ext}`);
    },
  }),
  fileFilter,
});
