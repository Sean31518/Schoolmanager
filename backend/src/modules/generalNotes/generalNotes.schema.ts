import { z } from "zod";
import { linksInputSchema } from "../links/links.service.js";

export const createGeneralNoteSchema = z.object({
  title: z.string().max(100).nullable().optional(),
  contentJson: z.record(z.string(), z.unknown()),
  links: linksInputSchema.optional(),
});

export const updateGeneralNoteSchema = z.object({
  title: z.string().max(100).nullable().optional(),
  contentJson: z.record(z.string(), z.unknown()).optional(),
  links: linksInputSchema.optional(),
});
