import type { Request, Response } from "express";
import { isRegistrationAllowed } from "../appSettings/appSettings.service.js";
import { env } from "../../config/env.js";
import { parseDurationMs } from "../../lib/duration.js";
import { UnauthorizedError } from "../../lib/errors.js";
import * as authService from "./auth.service.js";
import { loginSchema, registerSchema, updateMeSchema } from "./auth.schema.js";

const REFRESH_COOKIE_NAME = "refreshToken";
const REFRESH_COOKIE_PATH = "/api/auth";

function setRefreshCookie(res: Response, token: string) {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.COOKIE_SECURE,
    maxAge: parseDurationMs(env.JWT_REFRESH_EXPIRES_IN),
    path: REFRESH_COOKIE_PATH,
  });
}

function toUserDto(user: { id: string; email: string; displayName: string; role: string }) {
  return { id: user.id, email: user.email, displayName: user.displayName, role: user.role };
}

function readRefreshToken(req: Request): string | undefined {
  return req.cookies?.[REFRESH_COOKIE_NAME] ?? req.body?.refreshToken;
}

export async function registrationStatus(_req: Request, res: Response) {
  res.json({ enabled: await isRegistrationAllowed() });
}

export async function register(req: Request, res: Response) {
  // The actual gate (including the "first account ever" bootstrap
  // exception) lives in authService.register() itself, since it needs to
  // know whether this would be the first account - a plain "is it open"
  // check here would incorrectly block bootstrapping a fresh deployment
  // that has registration turned off before anyone has signed up yet.
  const body = registerSchema.parse(req.body);
  const { user, accessToken, refreshToken } = await authService.register(
    body.email,
    body.password,
    body.displayName,
  );

  setRefreshCookie(res, refreshToken);
  res.status(201).json({ user: toUserDto(user), accessToken });
}

export async function login(req: Request, res: Response) {
  const body = loginSchema.parse(req.body);
  const { user, accessToken, refreshToken } = await authService.login(
    body.email,
    body.password,
  );

  setRefreshCookie(res, refreshToken);
  res.json({ user: toUserDto(user), accessToken });
}

export async function refresh(req: Request, res: Response) {
  const rawToken = readRefreshToken(req);
  if (!rawToken) {
    throw new UnauthorizedError("Kein Refresh-Token vorhanden");
  }

  const { accessToken, refreshToken } = await authService.refresh(rawToken);
  setRefreshCookie(res, refreshToken);
  res.json({ accessToken });
}

export async function logout(req: Request, res: Response) {
  const rawToken = readRefreshToken(req);
  if (rawToken) {
    await authService.logout(rawToken);
  }
  res.clearCookie(REFRESH_COOKIE_NAME, { path: REFRESH_COOKIE_PATH });
  res.status(204).send();
}

export async function me(req: Request, res: Response) {
  const user = await authService.getMe(req.user!.id);
  res.json({ user: toUserDto(user), settings: user.settings });
}

export async function updateMe(req: Request, res: Response) {
  const body = updateMeSchema.parse(req.body);
  const user = await authService.updateMe(req.user!.id, body);
  res.json({ user: toUserDto(user) });
}

export async function deleteMe(req: Request, res: Response) {
  // Cascades through every relation on User, including RefreshToken - no
  // separate logout() call needed, the session is gone along with the row.
  await authService.deleteMe(req.user!.id);
  res.clearCookie(REFRESH_COOKIE_NAME, { path: REFRESH_COOKIE_PATH });
  res.status(204).send();
}
