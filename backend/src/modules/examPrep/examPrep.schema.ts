import { z } from "zod";

export const saveExamPrepSchema = z.object({
  items: z
    .array(
      z.object({
        noteId: z.string().min(1),
        sectionIndex: z.number().int().min(0),
        sectionLabel: z.string().min(1).max(200),
      }),
    )
    .max(200),
});

export const examPrepCandidatesQuerySchema = z.object({
  allSubjects: z
    .union([z.literal("true"), z.literal("false")])
    .optional()
    .transform((v) => v === "true"),
});
