import type { Request, Response } from "express";
import { z } from "zod";
import { confirmLink } from "../links/links.service.js";
import * as hefteService from "./hefte.service.js";

const listQuerySchema = z.object({
  archived: z.enum(["active", "archived", "all"]).default("active"),
  // A subject id, or "none" for "Ohne Fach".
  subjectId: z.string().optional(),
});

const updateSchema = z.object({ archived: z.boolean() });

const folderSubjectSchema = z.object({
  folderPath: z.string().min(1),
  subjectId: z.string().nullable(),
});

export async function list(req: Request, res: Response) {
  const query = listQuerySchema.parse(req.query);
  res.json(await hefteService.listHefte(req.user!.id, query));
}

export async function getOne(req: Request, res: Response) {
  res.json(await hefteService.getHeft(req.user!.id, req.params.id));
}

export async function update(req: Request, res: Response) {
  const body = updateSchema.parse(req.body);
  res.json(await hefteService.setArchived(req.user!.id, req.params.id, body.archived));
}

export async function pdf(req: Request, res: Response) {
  const { absolutePath, etag } = await hefteService.heftPdfPath(req.user!.id, req.params.id);
  // sendFile answers Range requests, so pdf.js can load a 200 MB Heft
  // page by page instead of downloading it whole first.
  res.sendFile(absolutePath, {
    headers: {
      "Content-Type": "application/pdf",
      "Cache-Control": "private, no-cache",
      ETag: `"${etag}"`,
    },
    etag: false,
    lastModified: false,
  });
}

export async function assignFolderSubject(req: Request, res: Response) {
  const body = folderSubjectSchema.parse(req.body);
  await hefteService.assignFolderSubject(req.user!.id, body.folderPath, body.subjectId);
  res.status(204).send();
}

export async function confirm(req: Request, res: Response) {
  res.json(await confirmLink(req.user!.id, req.params.id));
}
