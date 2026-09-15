import { z } from "zod";
import { calendarEventTypeSchema, federalStateSchema } from "../../lib/enums.js";

const manualEventTypeSchema = calendarEventTypeSchema.exclude(["HOLIDAY", "PUBLIC_HOLIDAY"]);
const colorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "Farbe muss ein Hex-Code sein, z.B. #3B82F6");

export const createCalendarEventSchema = z.object({
  title: z.string().min(1).max(200),
  type: manualEventTypeSchema.default("MANUAL"),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().nullable().optional(),
  allDay: z.boolean().optional(),
  subjectId: z.string().nullable().optional(),
  color: colorSchema.nullable().optional(),
  note: z.string().max(2000).nullable().optional(),
});

export const updateCalendarEventSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  type: manualEventTypeSchema.optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().nullable().optional(),
  allDay: z.boolean().optional(),
  subjectId: z.string().nullable().optional(),
  color: colorSchema.nullable().optional(),
  note: z.string().max(2000).nullable().optional(),
});

export const listCalendarEventsQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  type: calendarEventTypeSchema.optional(),
});

export const importHolidaysSchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  federalState: federalStateSchema.optional(),
});
