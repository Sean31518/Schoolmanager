import { z } from "zod";
import { federalStateSchema } from "../../lib/enums.js";

export const updateSettingsSchema = z.object({
  currentGradeLevel: z.number().int().min(1).max(13).optional(),
  currentSchoolYearLabel: z.string().max(20).nullable().optional(),
  federalState: federalStateSchema.optional(),
  iservHost: z.string().max(200).nullable().optional(),
  iservUsername: z.string().max(200).nullable().optional(),
  // Write-only - omit to leave the stored password unchanged. Empty string
  // is rejected on purpose; use DELETE /api/settings/iserv to disconnect.
  iservPassword: z.string().min(1).max(500).optional(),
  iservClass: z.string().max(100).nullable().optional(),
  iservActive: z.boolean().optional(),
});
