import type { Request, Response } from "express";
import * as notesService from "./notes.service.js";
import { createNoteSchema, reorderNotesSchema, updateNoteSchema } from "./notes.schema.js";

export async function list(req: Request, res: Response) {
  const notes = await notesService.listNotes(req.user!.id, req.params.topicId);
  res.json(notes);
}

export async function create(req: Request, res: Response) {
  const body = createNoteSchema.parse(req.body);
  const note = await notesService.createNote(req.user!.id, req.params.topicId, body);
  res.status(201).json(note);
}

export async function reorder(req: Request, res: Response) {
  const body = reorderNotesSchema.parse(req.body);
  const notes = await notesService.reorderNotes(req.user!.id, req.params.topicId, body);
  res.json(notes);
}

export async function getOne(req: Request, res: Response) {
  const note = await notesService.getNote(req.user!.id, req.params.id);
  res.json(note);
}

export async function update(req: Request, res: Response) {
  const body = updateNoteSchema.parse(req.body);
  const note = await notesService.updateNote(req.user!.id, req.params.id, body);
  res.json(note);
}

export async function remove(req: Request, res: Response) {
  await notesService.deleteNote(req.user!.id, req.params.id);
  res.status(204).send();
}
