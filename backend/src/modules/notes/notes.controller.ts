import type { Request, Response } from "express";
import * as notesService from "./notes.service.js";
import { noteContentSchema } from "./notes.schema.js";

export async function list(req: Request, res: Response) {
  const notes = await notesService.listNotes(req.user!.id, req.params.sectionTypeId);
  res.json(notes);
}

export async function getOne(req: Request, res: Response) {
  const note = await notesService.getNote(
    req.user!.id,
    req.params.sectionTypeId,
    req.params.gradeLevel,
  );
  res.json(note);
}

export async function upsert(req: Request, res: Response) {
  const body = noteContentSchema.parse(req.body);
  const note = await notesService.upsertNote(
    req.user!.id,
    req.params.sectionTypeId,
    req.params.gradeLevel,
    body.contentJson,
  );
  res.json(note);
}

export async function remove(req: Request, res: Response) {
  await notesService.deleteNote(req.user!.id, req.params.sectionTypeId, req.params.gradeLevel);
  res.status(204).send();
}
