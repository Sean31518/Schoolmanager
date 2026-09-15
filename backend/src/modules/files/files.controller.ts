import fs from "node:fs";
import type { Request, Response } from "express";
import { absoluteUploadPath } from "../../lib/storage.js";
import * as filesService from "./files.service.js";

export async function stream(req: Request, res: Response) {
  const file = await filesService.getOwnedFile(req.user!.id, req.params.id);
  const absolutePath = absoluteUploadPath(file.storagePath);
  const stat = await fs.promises.stat(absolutePath);

  res.setHeader("Content-Type", file.mimeType);
  res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(file.originalName)}"`);
  res.setHeader("Accept-Ranges", "bytes");

  const range = req.headers.range;
  if (!range) {
    res.setHeader("Content-Length", stat.size);
    fs.createReadStream(absolutePath).pipe(res);
    return;
  }

  const match = /^bytes=(\d*)-(\d*)$/.exec(range);
  if (!match) {
    res.status(416).setHeader("Content-Range", `bytes */${stat.size}`).end();
    return;
  }

  const start = match[1] ? Number(match[1]) : 0;
  const end = match[2] ? Number(match[2]) : stat.size - 1;
  if (start > end || end >= stat.size) {
    res.status(416).setHeader("Content-Range", `bytes */${stat.size}`).end();
    return;
  }

  res.status(206);
  res.setHeader("Content-Range", `bytes ${start}-${end}/${stat.size}`);
  res.setHeader("Content-Length", end - start + 1);
  fs.createReadStream(absolutePath, { start, end }).pipe(res);
}
