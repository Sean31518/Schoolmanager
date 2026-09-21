import type { NextFunction, Request, Response } from "express";
import { ForbiddenError } from "../lib/errors.js";

/** Must run after authGuard (needs req.user.role already set). */
export function adminGuard(req: Request, _res: Response, next: NextFunction) {
  if (req.user?.role !== "ADMIN") {
    next(new ForbiddenError("Nur für Admins"));
    return;
  }
  next();
}
