import type { Request, Response } from "express";
import * as topicsService from "./topics.service.js";
import { createTopicSchema, reorderTopicsSchema, updateTopicSchema } from "./topics.schema.js";

export async function list(req: Request, res: Response) {
  const topics = await topicsService.listTopics(req.user!.id, req.params.sectionTypeId);
  res.json(topics);
}

export async function create(req: Request, res: Response) {
  const body = createTopicSchema.parse(req.body);
  const topic = await topicsService.createTopic(req.user!.id, req.params.sectionTypeId, body);
  res.status(201).json(topic);
}

export async function reorder(req: Request, res: Response) {
  const body = reorderTopicsSchema.parse(req.body);
  const topics = await topicsService.reorderTopics(req.user!.id, req.params.sectionTypeId, body);
  res.json(topics);
}

export async function update(req: Request, res: Response) {
  const body = updateTopicSchema.parse(req.body);
  const topic = await topicsService.updateTopic(req.user!.id, req.params.id, body);
  res.json(topic);
}

export async function remove(req: Request, res: Response) {
  await topicsService.deleteTopic(req.user!.id, req.params.id);
  res.status(204).send();
}
