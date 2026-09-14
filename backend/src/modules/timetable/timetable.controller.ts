import type { Request, Response } from "express";
import * as timetableService from "./timetable.service.js";
import { upsertTimetableSlotSchema } from "./timetable.schema.js";

export async function get(req: Request, res: Response) {
  const timetable = await timetableService.getTimetable(req.user!.id);
  res.json(timetable);
}

export async function upsert(req: Request, res: Response) {
  const body = upsertTimetableSlotSchema.parse(req.body);
  const slot = await timetableService.upsertTimetableSlot(
    req.user!.id,
    req.params.weekday,
    req.params.timeGridSlotId,
    body,
  );
  res.json(slot);
}

export async function remove(req: Request, res: Response) {
  await timetableService.deleteTimetableSlot(
    req.user!.id,
    req.params.weekday,
    req.params.timeGridSlotId,
  );
  res.status(204).send();
}
