import { z } from "zod";

const hexColor = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export const createSubjectSchema = z.object({
  name: z.string().min(1).max(60),
  color: z.string().regex(hexColor, "Farbe muss ein Hex-Code sein, z.B. #3B82F6"),
  iservAlias: z.string().max(30).nullable().optional(),
});

export const updateSubjectSchema = createSubjectSchema.partial();
