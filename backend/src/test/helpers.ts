import { randomUUID } from "node:crypto";
import request from "supertest";
import { createApp } from "../app.js";

export const app = createApp();

export async function registerUser(
  overrides: Partial<{ email: string; password: string; displayName: string }> = {},
) {
  const email = overrides.email ?? `user-${randomUUID()}@example.com`;
  const password = overrides.password ?? "supersecret123";
  const displayName = overrides.displayName ?? "Test User";

  const res = await request(app)
    .post("/api/auth/register")
    .send({ email, password, displayName });

  return {
    email,
    password,
    accessToken: res.body.accessToken as string,
    userId: res.body.user.id as string,
  };
}
