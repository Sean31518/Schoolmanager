import type { Request, Response } from "express";
import * as subjectsService from "./subjects.service.js";
import { createSubjectSchema, updateSubjectSchema } from "./subjects.schema.js";

export async function list(req: Request, res: Response) {
  const subjects = await subjectsService.listSubjects(req.user!.id);
  res.json(subjects);
}

export async function create(req: Request, res: Response) {
  const body = createSubjectSchema.parse(req.body);
  const subject = await subjectsService.createSubject(req.user!.id, body);
  res.status(201).json(subject);
}

export async function getOne(req: Request, res: Response) {
  const subject = await subjectsService.getSubject(req.user!.id, req.params.id);
  res.json(subject);
}

export async function update(req: Request, res: Response) {
  const body = updateSubjectSchema.parse(req.body);
  const subject = await subjectsService.updateSubject(req.user!.id, req.params.id, body);
  res.json(subject);
}

export async function remove(req: Request, res: Response) {
  await subjectsService.deleteSubject(req.user!.id, req.params.id);
  res.status(204).send();
}
