import request from "supertest";
import { describe, expect, it } from "vitest";
import { app, registerUser } from "./helpers.js";

describe("Global search", () => {
  it("finds a subject, a note (by title and by content), homework, and a calendar event", async () => {
    const user = await registerUser();
    const headers = { Authorization: `Bearer ${user.accessToken}` };

    const subjectRes = await request(app)
      .post("/api/subjects")
      .set(headers)
      .send({ name: "Bruchrechnung-Mathe", color: "#3B82F6" });
    const subjectId = subjectRes.body.id as string;

    const sectionTypeRes = await request(app)
      .post(`/api/subjects/${subjectId}/section-types`)
      .set(headers)
      .send({ name: "Regelheft" });
    const sectionTypeId = sectionTypeRes.body.id as string;

    const topicRes = await request(app)
      .post(`/api/section-types/${sectionTypeId}/topics`)
      .set(headers)
      .send({ name: "Thema" });
    const topicId = topicRes.body.id as string;

    const noteByTitleRes = await request(app)
      .post(`/api/topics/${topicId}/notes`)
      .set(headers)
      .send({ title: "Findbarer Titel" });

    const noteByContentRes = await request(app)
      .post(`/api/topics/${topicId}/notes`)
      .set(headers)
      .send({ title: "Anderer Titel" });
    await request(app)
      .post(`/api/notes/${noteByContentRes.body.id}/blocks/text`)
      .set(headers)
      .send({ contentJson: { type: "doc", content: [{ type: "text", text: "Geheimwort42 steht hier" }] } });

    await request(app)
      .post("/api/homework")
      .set(headers)
      .send({ title: "Findbare Hausaufgabe" });

    await request(app)
      .post("/api/calendar-events")
      .set(headers)
      .send({ title: "Findbarer Termin", type: "MANUAL", startDate: "2026-11-01" });

    async function search(q: string) {
      const res = await request(app).get(`/api/search?q=${encodeURIComponent(q)}`).set(headers);
      expect(res.status).toBe(200);
      return res.body as Array<{ type: string; id: string; title: string; url: string }>;
    }

    const subjectResults = await search("Bruchrechnung-Mathe");
    expect(subjectResults.some((r) => r.type === "subject" && r.id === subjectId)).toBe(true);

    const noteTitleResults = await search("Findbarer Titel");
    expect(noteTitleResults.some((r) => r.type === "note" && r.id === noteByTitleRes.body.id)).toBe(
      true,
    );

    const noteContentResults = await search("Geheimwort42");
    expect(
      noteContentResults.some((r) => r.type === "note" && r.id === noteByContentRes.body.id),
    ).toBe(true);

    const homeworkResults = await search("Findbare Hausaufgabe");
    expect(homeworkResults.some((r) => r.type === "homework")).toBe(true);

    const eventResults = await search("Findbarer Termin");
    expect(eventResults.some((r) => r.type === "calendarEvent")).toBe(true);
  });

  it("only searches the authenticated user's own data", async () => {
    const userA = await registerUser();
    const userB = await registerUser();

    await request(app)
      .post("/api/subjects")
      .set({ Authorization: `Bearer ${userA.accessToken}` })
      .send({ name: "NurA-Geheimfach", color: "#3B82F6" });

    const res = await request(app)
      .get("/api/search?q=NurA-Geheimfach")
      .set({ Authorization: `Bearer ${userB.accessToken}` });

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(0);
  });

  it("returns nothing for a query shorter than 2 characters, without erroring", async () => {
    const user = await registerUser();
    const res = await request(app)
      .get("/api/search?q=a")
      .set({ Authorization: `Bearer ${user.accessToken}` });

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("rejects a missing query parameter and unauthenticated requests", async () => {
    const user = await registerUser();
    const missingQuery = await request(app)
      .get("/api/search")
      .set({ Authorization: `Bearer ${user.accessToken}` });
    expect(missingQuery.status).toBe(400);

    const unauth = await request(app).get("/api/search?q=test");
    expect(unauth.status).toBe(401);
  });
});
