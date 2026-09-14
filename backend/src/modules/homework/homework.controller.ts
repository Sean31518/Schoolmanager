import type { Request, Response } from "express";
import * as homeworkService from "./homework.service.js";
import {
  createHomeworkSchema,
  listHomeworkQuerySchema,
  updateHomeworkSchema,
} from "./homework.schema.js";

export async function list(req: Request, res: Response) {
  const query = listHomeworkQuerySchema.parse(req.query);
  const homework = await homeworkService.listHomework(req.user!.id, query);
  res.json(homework);
}

export async function create(req: Request, res: Response) {
  const body = createHomeworkSchema.parse(req.body);
  const homework = await homeworkService.createHomework(req.user!.id, body);
  res.status(201).json(homework);
}

export async function update(req: Request, res: Response) {
  const body = updateHomeworkSchema.parse(req.body);
  const homework = await homeworkService.updateHomework(req.user!.id, req.params.id, body);
  res.json(homework);
}

export async function remove(req: Request, res: Response) {
  await homeworkService.deleteHomework(req.user!.id, req.params.id);
  res.status(204).send();
}
