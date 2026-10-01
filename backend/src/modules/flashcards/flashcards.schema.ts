import { z } from "zod";
import { linksInputSchema } from "../links/links.service.js";

export const createDeckSchema = z.object({
  name: z.string().trim().min(1).max(100),
});

export const updateDeckSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  subjectId: z.string().optional(),
});

export const createFlashcardSchema = z.object({
  question: z.string().min(1).max(500),
  answer: z.string().min(1).max(2000),
  links: linksInputSchema.optional(),
});

export const updateFlashcardSchema = createFlashcardSchema.partial();

export const reviewFlashcardSchema = z.object({
  result: z.enum(["known", "again"]),
});
