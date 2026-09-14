import type { Request, Response } from "express";
import * as timeGridService from "./timeGrid.service.js";
import {
  createTimeGridSlotSchema,
  reorderTimeGridSlotsSchema,
  updateTimeGridSlotSchema,
} from "./timeGrid.schema.js";

export async function list(req: Request, res: Response) {
  const slots = await timeGridService.listTimeGridSlots(req.user!.id);
  res.json(slots);
}

export async function create(req: Request, res: Response) {
  const body = createTimeGridSlotSchema.parse(req.body);
  const slot = await timeGridService.createTimeGridSlot(req.user!.id, body);
  res.status(201).json(slot);
}

export async function reorder(req: Request, res: Response) {
  const body = reorderTimeGridSlotsSchema.parse(req.body);
  const slots = await timeGridService.reorderTimeGridSlots(req.user!.id, body);
  res.json(slots);
}

export async function update(req: Request, res: Response) {
  const body = updateTimeGridSlotSchema.parse(req.body);
  const slot = await timeGridService.updateTimeGridSlot(req.user!.id, req.params.id, body);
  res.json(slot);
}

export async function remove(req: Request, res: Response) {
  await timeGridService.deleteTimeGridSlot(req.user!.id, req.params.id);
  res.status(204).send();
}
