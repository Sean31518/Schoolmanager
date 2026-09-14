import request from "supertest";
import { describe, expect, it } from "vitest";
import { app, registerUser } from "./helpers.js";

describe("Ownership isolation between users", () => {
  it("prevents user B from reading, listing, or deleting user A's subject/section-type/note", async () => {
    const userA = await registerUser();
    const userB = await registerUser();
    const aHeaders = { Authorization: `Bearer ${userA.accessToken}` };
    const bHeaders = { Authorization: `Bearer ${userB.accessToken}` };

    const subjectRes = await request(app)
      .post("/api/subjects")
      .set(aHeaders)
      .send({ name: "Mathe", color: "#3B82F6" });
    const subjectId = subjectRes.body.id as string;

    const sectionRes = await request(app)
      .post(`/api/subjects/${subjectId}/section-types`)
      .set(aHeaders)
      .send({ name: "Regelheft" });
    const sectionTypeId = sectionRes.body.id as string;

    await request(app)
      .put(`/api/section-types/${sectionTypeId}/notes/5`)
      .set(aHeaders)
      .send({ contentJson: { type: "doc", content: [] } });

    expect((await request(app).get(`/api/subjects/${subjectId}`).set(bHeaders)).status).toBe(
      404,
    );
    expect(
      (await request(app).get(`/api/subjects/${subjectId}/section-types`).set(bHeaders)).status,
    ).toBe(404);
    expect(
      (await request(app).get(`/api/section-types/${sectionTypeId}/notes/5`).set(bHeaders))
        .status,
    ).toBe(404);
    expect(
      (await request(app).delete(`/api/section-types/${sectionTypeId}`).set(bHeaders)).status,
    ).toBe(404);

    // Sanity check: user A can still access their own resources.
    expect((await request(app).get(`/api/subjects/${subjectId}`).set(aHeaders)).status).toBe(
      200,
    );
  });

  it("prevents assigning another user's subject to a timetable slot", async () => {
    const userA = await registerUser();
    const userB = await registerUser();
    const aHeaders = { Authorization: `Bearer ${userA.accessToken}` };
    const bHeaders = { Authorization: `Bearer ${userB.accessToken}` };

    const subjectRes = await request(app)
      .post("/api/subjects")
      .set(aHeaders)
      .send({ name: "Physik", color: "#22C55E" });
    const subjectId = subjectRes.body.id as string;

    const slotRes = await request(app)
      .post("/api/time-grid")
      .set(bHeaders)
      .send({ label: "1. Stunde", type: "LESSON", startTime: "08:00", endTime: "08:45" });
    const timeGridSlotId = slotRes.body.id as string;

    const res = await request(app)
      .put(`/api/timetable/MONDAY/${timeGridSlotId}`)
      .set(bHeaders)
      .send({ subjectId });

    expect(res.status).toBe(404);
  });
});
