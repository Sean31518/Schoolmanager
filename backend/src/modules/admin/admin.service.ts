import argon2 from "argon2";
import type { z } from "zod";
import { ConflictError, NotFoundError, ValidationError } from "../../lib/errors.js";
import { prisma } from "../../lib/prisma.js";
import type { createUserSchema } from "./admin.schema.js";

const userListSelect = {
  id: true,
  email: true,
  displayName: true,
  role: true,
  createdAt: true,
  lastSeenAt: true,
} as const;

export async function listUsers() {
  return prisma.user.findMany({ orderBy: { createdAt: "asc" }, select: userListSelect });
}

/** Admin-created accounts are always plain USER - only the very first
 * account ever registered becomes ADMIN automatically (see
 * auth.service.ts's register()); promoting someone else isn't a feature
 * here, matching what was actually asked for. Bypasses the registration
 * on/off gate entirely, since that only governs self-service signup. */
export async function createUser(data: z.infer<typeof createUserSchema>) {
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) {
    throw new ConflictError("Diese E-Mail-Adresse wird bereits verwendet");
  }

  const passwordHash = await argon2.hash(data.password);
  return prisma.user.create({
    data: {
      email: data.email,
      passwordHash,
      displayName: data.displayName,
      role: "USER",
      settings: { create: {} },
    },
    select: userListSelect,
  });
}

export async function deleteUser(requestingAdminId: string, targetUserId: string): Promise<void> {
  if (requestingAdminId === targetUserId) {
    throw new ValidationError(
      "Das eigene Konto bitte über 'Konto löschen' in den Einstellungen entfernen.",
    );
  }
  const target = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!target) {
    throw new NotFoundError("Konto nicht gefunden");
  }
  await prisma.user.delete({ where: { id: targetUserId } });
}
