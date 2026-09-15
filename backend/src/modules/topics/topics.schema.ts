import { z } from "zod";

export const createTopicSchema = z.object({
  name: z.string().min(1).max(80),
  gradeLevel: z.number().int().min(1).max(13).nullable().optional(),
});

export const updateTopicSchema = createTopicSchema.partial();

export const reorderTopicsSchema = z.object({
  orderedIds: z.array(z.string()).min(1),
});
