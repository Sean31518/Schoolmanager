import { z } from "zod";

export const noteContentSchema = z.object({
  contentJson: z.record(z.string(), z.unknown()),
});
