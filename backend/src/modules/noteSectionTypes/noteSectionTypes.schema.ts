import { z } from "zod";

export const createSectionTypeSchema = z.object({
  name: z.string().min(1).max(60),
});

export const updateSectionTypeSchema = createSectionTypeSchema.partial();

export const reorderSectionTypesSchema = z.object({
  orderedIds: z.array(z.string()).min(1),
});
