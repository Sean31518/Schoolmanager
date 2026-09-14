import type { Request, Response } from "express";
import * as generalNotesService from "./generalNotes.service.js";
import {
  createGeneralNoteSchema,
  updateGeneralNoteSchema,
} from "./generalNotes.schema.js";

export async function list(req: Request, res: Response) {
  const notes = await generalNotesService.listGeneralNotes(req.user!.id);
  res.json(notes);
}

export async function create(req: Request, res: Response) {
  const body = createGeneralNoteSchema.parse(req.body);
  const note = await generalNotesService.createGeneralNote(req.user!.id, body);
  res.status(201).json(note);
}

export async function update(req: Request, res: Response) {
  const body = updateGeneralNoteSchema.parse(req.body);
  const note = await generalNotesService.updateGeneralNote(
    req.user!.id,
    req.params.id,
    body,
  );
  res.json(note);
}

export async function remove(req: Request, res: Response) {
  await generalNotesService.deleteGeneralNote(req.user!.id, req.params.id);
  res.status(204).send();
}
