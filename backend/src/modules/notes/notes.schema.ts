import { z } from "zod";

export const createNoteSchema = z.object({
  title: z.string().min(1).max(120),
  contentJson: z.unknown().optional(),
});

export const updateNoteSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  contentJson: z.unknown().optional(),
});

export const reorderNotesSchema = z.object({
  orderedIds: z.array(z.string()).min(1),
});
