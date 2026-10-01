import { z } from "zod";
import { linksInputSchema } from "../links/links.service.js";

export const createHomeworkSchema = z.object({
  title: z.string().min(1).max(200),
  subjectId: z.string().nullable().optional(),
  dueDate: z.coerce.date().nullable().optional(),
  note: z.string().max(2000).nullable().optional(),
  // Hefte or page ranges; replaces the full list when sent.
  links: linksInputSchema.optional(),
});

export const updateHomeworkSchema = createHomeworkSchema.partial().extend({
  done: z.boolean().optional(),
});

export const listHomeworkQuerySchema = z.object({
  done: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
  subjectId: z.string().optional(),
});

export const createSubtaskSchema = z.object({
  title: z.string().min(1).max(200),
});

export const updateSubtaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  done: z.boolean().optional(),
});

export const reorderSubtasksSchema = z.object({
  orderedIds: z.array(z.string()).min(1),
});
