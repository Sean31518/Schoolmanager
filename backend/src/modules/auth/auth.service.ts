import argon2 from "argon2";
import { isRegistrationAllowed } from "../appSettings/appSettings.service.js";
import { ConflictError, ForbiddenError, UnauthorizedError } from "../../lib/errors.js";
import { signAccessToken } from "../../lib/jwt.js";
import { prisma } from "../../lib/prisma.js";
import {
  generateRefreshToken,
  hashRefreshToken,
  refreshTokenExpiresAt,
} from "../../lib/refreshToken.js";

async function issueTokens(userId: string) {
  const accessToken = signAccessToken(userId);
  const refreshToken = generateRefreshToken();

  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: hashRefreshToken(refreshToken),
      expiresAt: refreshTokenExpiresAt(),
    },
  });

  return { accessToken, refreshToken };
}

export async function register(email: string, password: string, displayName: string) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new ConflictError("Diese E-Mail-Adresse wird bereits verwendet");
  }

  // The very first account ever created always succeeds regardless of the
  // registration gate, and becomes ADMIN - otherwise a fresh deployment
  // with registration turned off before anyone signs up could never be
  // bootstrapped without direct DB access.
  const isFirstUser = (await prisma.user.count()) === 0;
  if (!isFirstUser && !(await isRegistrationAllowed())) {
    throw new ForbiddenError("Registrierung ist auf diesem Server deaktiviert");
  }

  const passwordHash = await argon2.hash(password);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      displayName,
      role: isFirstUser ? "ADMIN" : "USER",
      settings: { create: {} },
    },
  });

  const tokens = await issueTokens(user.id);
  return { user, ...tokens };
}

/** Runs once at server startup - promotes the oldest existing account to
 * ADMIN if the database has users but none are marked admin yet. Covers
 * deployments upgrading into this feature, where "the first account ever
 * created" already happened long before roles existed; new deployments
 * never hit this, since register() already makes the first signup an
 * admin directly. */
export async function ensureAdminExists(): Promise<void> {
  const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
  if (adminCount > 0) return;

  const oldest = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });
  if (!oldest) return;

  await prisma.user.update({ where: { id: oldest.id }, data: { role: "ADMIN" } });
  console.log(`Kein Admin-Konto gefunden - "${oldest.email}" wurde automatisch zum Admin ernannt.`);
}

/** Deletes the account and everything it owns (cascades through every
 * user-owned relation, same as an admin deleting someone via the admin
 * panel) - available to any user for their own account. */
export async function deleteMe(userId: string): Promise<void> {
  await prisma.user.delete({ where: { id: userId } });
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new UnauthorizedError("E-Mail oder Passwort ist falsch");
  }

  const valid = await argon2.verify(user.passwordHash, password);
  if (!valid) {
    throw new UnauthorizedError("E-Mail oder Passwort ist falsch");
  }

  const tokens = await issueTokens(user.id);
  return { user, ...tokens };
}

export async function refresh(rawRefreshToken: string) {
  const tokenHash = hashRefreshToken(rawRefreshToken);
  const existing = await prisma.refreshToken.findUnique({ where: { tokenHash } });

  if (!existing || existing.revokedAt || existing.expiresAt < new Date()) {
    throw new UnauthorizedError("Refresh-Token ist ungültig oder abgelaufen");
  }

  await prisma.refreshToken.update({
    where: { id: existing.id },
    data: { revokedAt: new Date() },
  });

  return issueTokens(existing.userId);
}

export async function logout(rawRefreshToken: string) {
  const tokenHash = hashRefreshToken(rawRefreshToken);
  await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { settings: true },
  });
  if (!user) {
    throw new UnauthorizedError();
  }
  return user;
}
