import type { Request, Response } from "express";
import { env } from "../../config/env.js";
import { parseDurationMs } from "../../lib/duration.js";
import { ForbiddenError, UnauthorizedError } from "../../lib/errors.js";
import * as authService from "./auth.service.js";
import { loginSchema, registerSchema } from "./auth.schema.js";

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

function toUserDto(user: { id: string; email: string; displayName: string }) {
  return { id: user.id, email: user.email, displayName: user.displayName };
}

function readRefreshToken(req: Request): string | undefined {
  return req.cookies?.[REFRESH_COOKIE_NAME] ?? req.body?.refreshToken;
}

export async function register(req: Request, res: Response) {
  if (!env.ALLOW_REGISTRATION) {
    throw new ForbiddenError("Registrierung ist auf diesem Server deaktiviert");
  }

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
