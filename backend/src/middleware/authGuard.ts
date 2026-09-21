import type { NextFunction, Request, Response } from "express";
import { UnauthorizedError } from "../lib/errors.js";
import { verifyAccessToken } from "../lib/jwt.js";
import { prisma } from "../lib/prisma.js";

/** Verifies the access token, then bumps lastSeenAt (the "zuletzt online"
 * an admin sees per account) and attaches the user's current role to the
 * request - both in one write, so this costs no extra read on top of what
 * every authenticated request already needed. Written as a manual
 * promise chain rather than an `async function` so it stays a drop-in
 * middleware at every existing `router.use(authGuard)` call site without
 * needing each of them wrapped in asyncHandler. */
export function authGuard(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    next(new UnauthorizedError("Kein Zugriffstoken vorhanden"));
    return;
  }

  const token = header.slice("Bearer ".length);
  let userId: string;
  try {
    userId = verifyAccessToken(token).sub;
  } catch {
    next(new UnauthorizedError("Zugriffstoken ungültig oder abgelaufen"));
    return;
  }

  prisma.user
    .update({
      where: { id: userId },
      data: { lastSeenAt: new Date() },
      select: { role: true },
    })
    .then((user) => {
      req.user = { id: userId, role: user.role as "ADMIN" | "USER" };
      next();
    })
    .catch(() => {
      // Most likely the account was deleted after this token was issued -
      // an invalid/expired token is the accurate framing either way.
      next(new UnauthorizedError("Zugriffstoken ungültig oder abgelaufen"));
    });
}
