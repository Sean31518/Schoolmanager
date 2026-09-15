import { z } from "zod";

export const createNoteSchema = z.object({
  title: z.string().min(1).max(120),
});

export const updateNoteSchema = z.object({
  title: z.string().min(1).max(120).optional(),
});

export const reorderNotesSchema = z.object({
  orderedIds: z.array(z.string()).min(1),
});
