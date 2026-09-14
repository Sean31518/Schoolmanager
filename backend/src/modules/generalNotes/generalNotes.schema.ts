import { z } from "zod";

export const createGeneralNoteSchema = z.object({
  title: z.string().max(100).nullable().optional(),
  contentJson: z.record(z.string(), z.unknown()),
});

export const updateGeneralNoteSchema = z.object({
  title: z.string().max(100).nullable().optional(),
  contentJson: z.record(z.string(), z.unknown()).optional(),
});
