import { z } from "zod";

export const createTextBlockSchema = z.object({
  contentJson: z.unknown().optional(),
});

export const createLinkBlockSchema = z.object({
  url: z.string().url().max(2000),
});

export const createVideoBlockSchema = z.object({
  fileId: z.string().min(1),
});

export const createPdfBlockSchema = z.object({
  fileId: z.string().min(1),
  pageCount: z.number().int().min(1).max(2000),
});

export const updateBlockSchema = z.object({
  contentJson: z.unknown().optional(),
  url: z.string().url().max(2000).optional(),
});

export const reorderBlocksSchema = z.object({
  orderedIds: z.array(z.string()).min(1),
});
