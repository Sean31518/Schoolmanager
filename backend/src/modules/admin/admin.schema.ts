import { z } from "zod";

export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(1).max(80),
});

export const updateAppSettingsSchema = z.object({
  registrationEnabled: z.boolean(),
});
