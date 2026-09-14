import { z } from "zod";

export const upsertTimetableSlotSchema = z.object({
  subjectId: z.string().nullable(),
  room: z.string().max(40).nullable().optional(),
  note: z.string().max(200).nullable().optional(),
});
