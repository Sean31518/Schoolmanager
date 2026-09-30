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

/** A PDF with one page per label, each page drawing its label - so pages
 * with the same label get the same fingerprint, like an unchanged page
 * re-exported by Goodnotes. */
export async function makePdf(labels: string[]) {
  const { PDFDocument } = await import("pdf-lib");
  const doc = await PDFDocument.create();
  for (const label of labels) {
    const page = doc.addPage([400, 400]);
    page.drawText(label, { x: 50, y: 200, size: 24 });
  }
  return Buffer.from(await doc.save({ useObjectStreams: false }));
}

/** A registered user plus a WebDAV Basic auth header built from a fresh
 * app password. */
export async function registerDavUser() {
  const user = await registerUser();
  const res = await request(app)
    .post("/api/app-passwords")
    .set({ Authorization: `Bearer ${user.accessToken}` })
    .send({ label: "iPad" });
  const davAuth = "Basic " + Buffer.from(`${user.email}:${res.body.password}`).toString("base64");
  return { ...user, appPassword: res.body.password as string, davAuth };
}
