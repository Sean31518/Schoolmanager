import { z } from "zod";
import { federalStateSchema } from "../../lib/enums.js";

export const updateSettingsSchema = z.object({
  currentGradeLevel: z.number().int().min(1).max(13).optional(),
  currentSchoolYearLabel: z.string().max(20).nullable().optional(),
  federalState: federalStateSchema.optional(),
});
