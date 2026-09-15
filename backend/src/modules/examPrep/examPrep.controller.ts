import type { Request, Response } from "express";
import * as examPrepService from "./examPrep.service.js";
import { examPrepCandidatesQuerySchema, saveExamPrepSchema } from "./examPrep.schema.js";

export async function get(req: Request, res: Response) {
  const items = await examPrepService.getExamPrep(req.user!.id, req.params.eventId);
  res.json({ items });
}

export async function save(req: Request, res: Response) {
  const body = saveExamPrepSchema.parse(req.body);
  const items = await examPrepService.saveExamPrep(req.user!.id, req.params.eventId, body);
  res.json({ items });
}

export async function candidates(req: Request, res: Response) {
  const query = examPrepCandidatesQuerySchema.parse(req.query);
  const notes = await examPrepService.getExamPrepCandidates(
    req.user!.id,
    req.params.eventId,
    query.allSubjects ?? false,
  );
  res.json(notes);
}
