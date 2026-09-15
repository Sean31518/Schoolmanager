import type { Request, Response } from "express";
import * as uploadsService from "./uploads.service.js";

export async function create(req: Request, res: Response) {
  const file = await uploadsService.createUploadedFile(req.user!.id, req.file!);
  res.status(201).json({
    id: file.id,
    originalName: file.originalName,
    mimeType: file.mimeType,
    size: file.size,
  });
}
