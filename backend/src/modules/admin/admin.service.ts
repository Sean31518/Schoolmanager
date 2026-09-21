import argon2 from "argon2";
import type { z } from "zod";
import { ConflictError, NotFoundError, ValidationError } from "../../lib/errors.js";
import { prisma } from "../../lib/prisma.js";
import type { createUserSchema, updateUserSchema } from "./admin.schema.js";

const userListSelect = {
  id: true,
  email: true,
  displayName: true,
  role: true,
  createdAt: true,
  lastSeenAt: true,
} as const;

export async function listUsers() {
  const [users, storageByUser] = await Promise.all([
    prisma.user.findMany({ orderBy: { createdAt: "asc" }, select: userListSelect }),
    prisma.uploadedFile.groupBy({ by: ["userId"], _sum: { size: true } }),
  ]);
  const storageMap = new Map(storageByUser.map((row) => [row.userId, row._sum.size ?? 0]));
  return users.map((user) => ({ ...user, storageBytes: storageMap.get(user.id) ?? 0 }));
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

/** Full account management for a target user - display name, email, role
 * (promote/demote), and a direct password reset (no current-password check,
 * unlike the self-service equivalent, since an admin acting here already
 * proved their own identity via adminGuard). Guards only against dropping
 * the app to zero admins; editing your own account through this endpoint
 * (including demoting yourself, as long as another admin remains) is
 * otherwise allowed rather than special-cased. */
export async function updateUser(targetUserId: string, data: z.infer<typeof updateUserSchema>) {
  const target = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!target) {
    throw new NotFoundError("Konto nicht gefunden");
  }

  if (data.email && data.email !== target.email) {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      throw new ConflictError("Diese E-Mail-Adresse wird bereits verwendet");
    }
  }

  if (data.role && data.role !== target.role && target.role === "ADMIN") {
    const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
    if (adminCount <= 1) {
      throw new ValidationError("Der letzte Admin kann nicht entfernt werden");
    }
  }

  return prisma.user.update({
    where: { id: targetUserId },
    data: {
      ...(data.displayName ? { displayName: data.displayName } : {}),
      ...(data.email ? { email: data.email } : {}),
      ...(data.role ? { role: data.role } : {}),
      ...(data.password ? { passwordHash: await argon2.hash(data.password) } : {}),
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
