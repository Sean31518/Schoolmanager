import argon2 from "argon2";
import { ConflictError, UnauthorizedError } from "../../lib/errors.js";
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

  const passwordHash = await argon2.hash(password);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      displayName,
      settings: { create: {} },
    },
  });

  const tokens = await issueTokens(user.id);
  return { user, ...tokens };
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
