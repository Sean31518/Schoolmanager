import request from "supertest";
import { describe, expect, it } from "vitest";
import { app, registerUser } from "./helpers.js";

describe("Auth", () => {
  it("registers a new user and returns an access token", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({
        email: `a-${Date.now()}@example.com`,
        password: "supersecret123",
        displayName: "A",
      });

    expect(res.status).toBe(201);
    expect(res.body.accessToken).toBeTypeOf("string");
    expect(res.body.user.email).toContain("@example.com");
  });

  it("rejects duplicate email registration", async () => {
    const email = `dup-${Date.now()}@example.com`;
    await request(app)
      .post("/api/auth/register")
      .send({ email, password: "supersecret123", displayName: "A" });

    const res = await request(app)
      .post("/api/auth/register")
      .send({ email, password: "supersecret123", displayName: "A" });

    expect(res.status).toBe(409);
  });

  it("rejects registration with a too-short password", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: `weak-${Date.now()}@example.com`, password: "123", displayName: "A" });

    expect(res.status).toBe(400);
  });

  it("rejects login with wrong password", async () => {
    const { email } = await registerUser();
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email, password: "wrong-password" });

    expect(res.status).toBe(401);
  });

  it("rejects /me without a token", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  it("returns the current user via /me with a valid token", async () => {
    const { accessToken, email } = await registerUser();
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(email);
    expect(res.body.settings.federalState).toBe("BW");
  });

  it("lets a user rename themselves without needing their password", async () => {
    const { accessToken } = await registerUser();
    const res = await request(app)
      .patch("/api/auth/me")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ displayName: "Neuer Name" });

    expect(res.status).toBe(200);
    expect(res.body.user.displayName).toBe("Neuer Name");
  });

  it("requires the current password to change email or password, and rejects a wrong one", async () => {
    const { accessToken, password } = await registerUser();
    const headers = { Authorization: `Bearer ${accessToken}` };

    const missing = await request(app)
      .patch("/api/auth/me")
      .set(headers)
      .send({ newPassword: "brandnewpass123" });
    expect(missing.status).toBe(400);

    const wrong = await request(app)
      .patch("/api/auth/me")
      .set(headers)
      .send({ newPassword: "brandnewpass123", currentPassword: "definitely-wrong" });
    expect(wrong.status).toBe(401);

    const ok = await request(app)
      .patch("/api/auth/me")
      .set(headers)
      .send({ newPassword: "brandnewpass123", currentPassword: password });
    expect(ok.status).toBe(200);

    // Old password no longer works, new one does.
    const oldLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: ok.body.user.email, password });
    expect(oldLogin.status).toBe(401);
    const newLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: ok.body.user.email, password: "brandnewpass123" });
    expect(newLogin.status).toBe(200);
  });

  it("rejects changing to an email already used by another account", async () => {
    const existing = await registerUser();
    const { accessToken, password } = await registerUser();

    const res = await request(app)
      .patch("/api/auth/me")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ email: existing.email, currentPassword: password });
    expect(res.status).toBe(409);
  });

  it("rotates the refresh token and invalidates it after logout", async () => {
    const { email, password } = await registerUser();
    const loginRes = await request(app).post("/api/auth/login").send({ email, password });
    const cookie = loginRes.headers["set-cookie"];
    expect(cookie).toBeDefined();

    const refreshRes = await request(app).post("/api/auth/refresh").set("Cookie", cookie);
    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.accessToken).toBeTypeOf("string");

    const newCookie = refreshRes.headers["set-cookie"];
    const logoutRes = await request(app).post("/api/auth/logout").set("Cookie", newCookie);
    expect(logoutRes.status).toBe(204);

    const refreshAfterLogout = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", newCookie);
    expect(refreshAfterLogout.status).toBe(401);
  });
});
