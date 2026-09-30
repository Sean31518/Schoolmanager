import { z } from "zod";

export const createAppPasswordSchema = z.object({
  label: z.string().trim().min(1).max(100),
});
