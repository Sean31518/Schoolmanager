import type { Settings } from "@prisma/client";
import type { z } from "zod";
import { encryptSecret, isCredentialsEncryptionConfigured } from "../../lib/credentialsCrypto.js";
import { NotFoundError, ValidationError } from "../../lib/errors.js";
import { prisma } from "../../lib/prisma.js";
import { isIservConfigured, syncUserIservTimetable } from "../iserv/iservSync.service.js";
import type { updateSettingsSchema } from "./settings.schema.js";

/** Never send the encrypted IServ password to the frontend - it has no use
 * there, and there's no reason to expose even ciphertext unnecessarily.
 * iservConfigured tells the UI whether a password is on file without it. */
function toPublicSettings(settings: Settings) {
  const { iservPasswordEncrypted, ...rest } = settings;
  return { ...rest, iservConfigured: isIservConfigured(settings) };
}

export async function getSettings(userId: string) {
  const settings = await prisma.settings.findUnique({ where: { userId } });
  if (!settings) {
    throw new NotFoundError("Einstellungen nicht gefunden");
  }
  return toPublicSettings(settings);
}

export async function updateSettings(
  userId: string,
  data: z.infer<typeof updateSettingsSchema>,
) {
  const { iservPassword, ...rest } = data;

  if (iservPassword !== undefined && !isCredentialsEncryptionConfigured()) {
    throw new ValidationError(
      "IServ-Anbindung ist serverseitig nicht konfiguriert (CREDENTIALS_ENCRYPTION_KEY fehlt).",
    );
  }

  const settings = await prisma.settings.update({
    where: { userId },
    data: {
      ...rest,
      ...(iservPassword !== undefined ? { iservPasswordEncrypted: encryptSecret(iservPassword) } : {}),
    },
  });
  return toPublicSettings(settings);
}

export async function disconnectIserv(userId: string) {
  const settings = await prisma.settings.update({
    where: { userId },
    data: {
      iservHost: null,
      iservUsername: null,
      iservPasswordEncrypted: null,
      iservClass: null,
      iservLastSyncAt: null,
      iservLastSyncError: null,
    },
  });
  return toPublicSettings(settings);
}

export async function triggerIservSync(userId: string) {
  const settings = await prisma.settings.findUnique({ where: { userId } });
  if (!settings || !isIservConfigured(settings)) {
    throw new ValidationError("IServ ist für dieses Konto nicht eingerichtet.");
  }
  await syncUserIservTimetable(userId);
  return getSettings(userId);
}
