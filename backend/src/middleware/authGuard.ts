import type { NextFunction, Request, Response } from "express";
import { UnauthorizedError } from "../lib/errors.js";
import { verifyAccessToken } from "../lib/jwt.js";

export function authGuard(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw new UnauthorizedError("Kein Zugriffstoken vorhanden");
  }

  const token = header.slice("Bearer ".length);
  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub };
    next();
  } catch {
    throw new UnauthorizedError("Zugriffstoken ungültig oder abgelaufen");
  }
}
