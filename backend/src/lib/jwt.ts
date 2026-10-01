import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export interface AccessTokenPayload {
  sub: string;
}

export function signAccessToken(userId: string): string {
  return jwt.sign({ sub: userId }, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
  } as jwt.SignOptions);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
}

// pdf.js loads a Heft with many Range requests over the whole time it's
// open, without our auth headers or refresh logic - so the viewer gets a
// URL with its own longer-lived token, valid only for that one Heft.
const HEFT_VIEW_TOKEN_EXPIRES_IN = "12h";

export function signHeftViewToken(userId: string, fileId: string): string {
  return jwt.sign({ sub: userId, fileId, purpose: "heft-view" }, env.JWT_ACCESS_SECRET, {
    expiresIn: HEFT_VIEW_TOKEN_EXPIRES_IN,
  });
}

export function verifyHeftViewToken(token: string, fileId: string): string {
  const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as {
    sub: string;
    fileId?: string;
    purpose?: string;
  };
  if (payload.purpose !== "heft-view" || payload.fileId !== fileId) {
    throw new Error("Token gilt nicht für dieses Heft");
  }
  return payload.sub;
}
