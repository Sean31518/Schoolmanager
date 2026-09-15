import { z } from "zod";

export const createFlashcardSchema = z.object({
  question: z.string().min(1).max(500),
  answer: z.string().min(1).max(2000),
});

export const updateFlashcardSchema = createFlashcardSchema.partial();

export const reviewFlashcardSchema = z.object({
  result: z.enum(["known", "again"]),
});
