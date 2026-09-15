import type { NextFunction, Request, Response } from "express";
import { UnauthorizedError } from "../../lib/errors.js";
import { verifyAccessToken } from "../../lib/jwt.js";

// <video>/<iframe> tags can't set an Authorization header, so this endpoint
// also accepts the access token as a query param. Fine here specifically
// because access tokens are short-lived and this route only ever serves a
// single file, unlike the JSON API.
export function fileAuthGuard(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ")
    ? header.slice("Bearer ".length)
    : typeof req.query.token === "string"
      ? req.query.token
      : undefined;

  if (!token) {
    throw new UnauthorizedError("Kein Zugriffstoken vorhanden");
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub };
    next();
  } catch {
    throw new UnauthorizedError("Zugriffstoken ungültig oder abgelaufen");
  }
}
