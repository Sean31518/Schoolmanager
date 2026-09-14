import { z } from "zod";

// SQLite hat keine nativen Enums in Prisma - diese Werte werden als String
// gespeichert (siehe schema.prisma) und hier auf Anwendungsebene validiert.

export const federalStates = [
  "BW",
  "BY",
  "BE",
  "BB",
  "HB",
  "HH",
  "HE",
  "MV",
  "NI",
  "NW",
  "RP",
  "SL",
  "SN",
  "ST",
  "SH",
  "TH",
] as const;
export const federalStateSchema = z.enum(federalStates);
export type FederalState = z.infer<typeof federalStateSchema>;

export const weekdays = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
] as const;
export const weekdaySchema = z.enum(weekdays);
export type Weekday = z.infer<typeof weekdaySchema>;

export const timeGridSlotTypes = ["LESSON", "BREAK"] as const;
export const timeGridSlotTypeSchema = z.enum(timeGridSlotTypes);
export type TimeGridSlotType = z.infer<typeof timeGridSlotTypeSchema>;

export const calendarEventTypes = [
  "MANUAL",
  "EXAM",
  "HOLIDAY",
  "PUBLIC_HOLIDAY",
] as const;
export const calendarEventTypeSchema = z.enum(calendarEventTypes);
export type CalendarEventType = z.infer<typeof calendarEventTypeSchema>;
