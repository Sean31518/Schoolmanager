import { z } from "zod";

export const createHomeworkSchema = z.object({
  title: z.string().min(1).max(200),
  subjectId: z.string().nullable().optional(),
  dueDate: z.coerce.date().nullable().optional(),
  note: z.string().max(2000).nullable().optional(),
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
