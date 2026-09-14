import type { z } from "zod";
import { NotFoundError } from "../../lib/errors.js";
import { prisma } from "../../lib/prisma.js";
import type { updateSettingsSchema } from "./settings.schema.js";

export async function getSettings(userId: string) {
  const settings = await prisma.settings.findUnique({ where: { userId } });
  if (!settings) {
    throw new NotFoundError("Einstellungen nicht gefunden");
  }
  return settings;
}

export async function updateSettings(
  userId: string,
  data: z.infer<typeof updateSettingsSchema>,
) {
  return prisma.settings.update({ where: { userId }, data });
}
