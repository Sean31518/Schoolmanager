import { env } from "../../config/env.js";
import { prisma } from "../../lib/prisma.js";

const SINGLETON_ID = "singleton";

export async function getAppSettings() {
  const settings = await prisma.appSettings.upsert({
    where: { id: SINGLETON_ID },
    create: { id: SINGLETON_ID },
    update: {},
  });
  return settings;
}

export async function setRegistrationEnabled(enabled: boolean) {
  return prisma.appSettings.upsert({
    where: { id: SINGLETON_ID },
    create: { id: SINGLETON_ID, registrationEnabled: enabled },
    update: { registrationEnabled: enabled },
  });
}

/** ALLOW_REGISTRATION is a deploy-time hard override (a self-hoster can
 * lock registration off no matter what's toggled in the app);
 * registrationEnabled is what an admin actually manages day to day from
 * Settings. Both gate registration - either one being off blocks it. */
export async function isRegistrationAllowed(): Promise<boolean> {
  if (!env.ALLOW_REGISTRATION) return false;
  const settings = await getAppSettings();
  return settings.registrationEnabled;
}
