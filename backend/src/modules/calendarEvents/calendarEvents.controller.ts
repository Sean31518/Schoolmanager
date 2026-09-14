import type { Request, Response } from "express";
import type { FederalState } from "../../lib/enums.js";
import { prisma } from "../../lib/prisma.js";
import * as holidaysService from "../holidays/holidays.service.js";
import * as calendarEventsService from "./calendarEvents.service.js";
import {
  createCalendarEventSchema,
  importHolidaysSchema,
  listCalendarEventsQuerySchema,
  updateCalendarEventSchema,
} from "./calendarEvents.schema.js";

export async function list(req: Request, res: Response) {
  const query = listCalendarEventsQuerySchema.parse(req.query);
  const events = await calendarEventsService.listCalendarEvents(req.user!.id, query);
  res.json(events);
}

export async function create(req: Request, res: Response) {
  const body = createCalendarEventSchema.parse(req.body);
  const event = await calendarEventsService.createCalendarEvent(req.user!.id, body);
  res.status(201).json(event);
}

export async function update(req: Request, res: Response) {
  const body = updateCalendarEventSchema.parse(req.body);
  const event = await calendarEventsService.updateCalendarEvent(
    req.user!.id,
    req.params.id,
    body,
  );
  res.json(event);
}

export async function remove(req: Request, res: Response) {
  await calendarEventsService.deleteCalendarEvent(req.user!.id, req.params.id);
  res.status(204).send();
}

export async function importHolidays(req: Request, res: Response) {
  const body = importHolidaysSchema.parse(req.body);

  let federalState = body.federalState;
  if (!federalState) {
    const settings = await prisma.settings.findUnique({ where: { userId: req.user!.id } });
    federalState = (settings?.federalState as FederalState | undefined) ?? "BW";
  }

  const result = await holidaysService.importHolidays(req.user!.id, body.year, federalState);
  res.json(result);
}
