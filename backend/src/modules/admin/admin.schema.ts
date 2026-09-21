import { z } from "zod";

export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(1).max(80),
});

export const updateAppSettingsSchema = z.object({
  registrationEnabled: z.boolean(),
});

export const updateUserSchema = z.object({
  displayName: z.string().min(1).max(80).optional(),
  email: z.string().email().optional(),
  role: z.enum(["ADMIN", "USER"]).optional(),
  password: z.string().min(8).optional(),
});
