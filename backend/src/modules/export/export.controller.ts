import type { Request, Response } from "express";
import { importDataSchema } from "./export.schema.js";
import * as exportService from "./export.service.js";

export async function exportAll(req: Request, res: Response) {
  const data = await exportService.getFullExport(req.user!.id);
  const filename = `schulmanager-export-${new Date().toISOString().slice(0, 10)}.json`;
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.json(data);
}

export async function importAll(req: Request, res: Response) {
  const payload = importDataSchema.parse(req.body);
  const summary = await exportService.importUserData(req.user!.id, payload);
  res.json({ summary });
}
