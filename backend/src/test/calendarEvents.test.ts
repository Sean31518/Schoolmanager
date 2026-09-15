import request from "supertest";
import { describe, expect, it } from "vitest";
import { app, registerUser } from "./helpers.js";

describe("Calendar event CRUD", () => {
  it("creates an event with an explicit color and updates title/dates/color afterward", async () => {
    const user = await registerUser();
    const headers = { Authorization: `Bearer ${user.accessToken}` };

    const createRes = await request(app)
      .post("/api/calendar-events")
      .set(headers)
      .send({
        title: "Wandertag",
        type: "MANUAL",
        startDate: "2026-09-20",
        color: "#22C55E",
      });
    expect(createRes.status).toBe(201);
    expect(createRes.body.color).toBe("#22C55E");
    const eventId = createRes.body.id as string;

    const updateRes = await request(app)
      .patch(`/api/calendar-events/${eventId}`)
      .set(headers)
      .send({
        title: "Wandertag (verschoben)",
        startDate: "2026-09-21",
        endDate: "2026-09-23",
        color: "#F59E0B",
      });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body).toMatchObject({
      title: "Wandertag (verschoben)",
      color: "#F59E0B",
    });
    expect(updateRes.body.endDate).not.toBeNull();
  });

  it("rejects a non-hex color", async () => {
    const user = await registerUser();
    const headers = { Authorization: `Bearer ${user.accessToken}` };

    const res = await request(app)
      .post("/api/calendar-events")
      .set(headers)
      .send({ title: "Termin", type: "MANUAL", startDate: "2026-09-20", color: "blue" });
    expect(res.status).toBe(400);
  });

  it("clears an explicit color back to null via update", async () => {
    const user = await registerUser();
    const headers = { Authorization: `Bearer ${user.accessToken}` };

    const createRes = await request(app)
      .post("/api/calendar-events")
      .set(headers)
      .send({ title: "Termin", type: "MANUAL", startDate: "2026-09-20", color: "#3B82F6" });
    const eventId = createRes.body.id as string;

    const updateRes = await request(app)
      .patch(`/api/calendar-events/${eventId}`)
      .set(headers)
      .send({ color: null });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.color).toBeNull();
  });
});
