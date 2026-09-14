import { z } from "zod";
import { timeGridSlotTypeSchema } from "../../lib/enums.js";

const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const createTimeGridSlotSchema = z.object({
  label: z.string().min(1).max(40),
  type: timeGridSlotTypeSchema,
  startTime: z.string().regex(timePattern, "Format HH:mm erwartet"),
  endTime: z.string().regex(timePattern, "Format HH:mm erwartet"),
});

export const updateTimeGridSlotSchema = createTimeGridSlotSchema.partial();

export const reorderTimeGridSlotsSchema = z.object({
  orderedIds: z.array(z.string()).min(1),
});
