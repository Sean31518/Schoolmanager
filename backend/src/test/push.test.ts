import request from "supertest";
import { describe, expect, it } from "vitest";
import { app, registerUser } from "./helpers.js";

describe("Push subscriptions", () => {
  it("reports whether push is server-configured, without requiring auth", async () => {
    const res = await request(app).get("/api/push/vapid-public-key");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("configured");
  });

  it("saves and reports an active subscription, then removes it on unsubscribe", async () => {
    const user = await registerUser();
    const headers = { Authorization: `Bearer ${user.accessToken}` };

    const before = await request(app).get("/api/push/status").set(headers);
    expect(before.body.active).toBe(false);

    const subscribeRes = await request(app)
      .post("/api/push/subscribe")
      .set(headers)
      .send({
        endpoint: "https://push.example.com/abc123",
        keys: { p256dh: "test-p256dh", auth: "test-auth" },
      });
    expect(subscribeRes.status).toBe(201);

    const afterSubscribe = await request(app).get("/api/push/status").set(headers);
    expect(afterSubscribe.body.active).toBe(true);

    const unsubscribeRes = await request(app)
      .post("/api/push/unsubscribe")
      .set(headers)
      .send({ endpoint: "https://push.example.com/abc123" });
    expect(unsubscribeRes.status).toBe(204);

    const afterUnsubscribe = await request(app).get("/api/push/status").set(headers);
    expect(afterUnsubscribe.body.active).toBe(false);
  });

  it("rejects subscribe/unsubscribe/status without authentication", async () => {
    expect((await request(app).get("/api/push/status")).status).toBe(401);
    expect((await request(app).post("/api/push/subscribe").send({})).status).toBe(401);
    expect((await request(app).post("/api/push/unsubscribe").send({})).status).toBe(401);
  });

  it("rejects a subscription missing required fields", async () => {
    const user = await registerUser();
    const res = await request(app)
      .post("/api/push/subscribe")
      .set({ Authorization: `Bearer ${user.accessToken}` })
      .send({ endpoint: "not-a-url" });
    expect(res.status).toBe(400);
  });
});
