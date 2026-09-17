import request from "supertest";
import { describe, expect, it } from "vitest";
import { app, registerUser } from "./helpers.js";

describe("Data export", () => {
  it("returns a full JSON dump of the user's own data as a download", async () => {
    const user = await registerUser();
    const headers = { Authorization: `Bearer ${user.accessToken}` };

    const subjectRes = await request(app)
      .post("/api/subjects")
      .set(headers)
      .send({ name: "Mathe", color: "#3B82F6" });
    expect(subjectRes.status).toBe(201);
    const subjectId = subjectRes.body.id as string;

    await request(app)
      .post("/api/homework")
      .set(headers)
      .send({ title: "Übungsblatt 3", subjectId });

    await request(app)
      .post("/api/general-notes")
      .set(headers)
      .send({ contentJson: { type: "doc", content: [] } });

    const res = await request(app).get("/api/export").set(headers);

    expect(res.status).toBe(200);
    expect(res.headers["content-disposition"]).toMatch(/^attachment; filename="schulmanager-export-/);
    expect(res.body.user.email).toBe(user.email);
    expect(res.body.user.passwordHash).toBeUndefined();
    expect(res.body.subjects).toHaveLength(1);
    expect(res.body.subjects[0].name).toBe("Mathe");
    expect(res.body.homework).toHaveLength(1);
    expect(res.body.homework[0].title).toBe("Übungsblatt 3");
    expect(res.body.generalNotes).toHaveLength(1);
    expect(res.body.generalNotes[0].contentJson).toEqual({ type: "doc", content: [] });
  });

  it("only exports the authenticated user's own data", async () => {
    const userA = await registerUser();
    const userB = await registerUser();

    await request(app)
      .post("/api/subjects")
      .set({ Authorization: `Bearer ${userA.accessToken}` })
      .send({ name: "Nur A", color: "#3B82F6" });

    const res = await request(app)
      .get("/api/export")
      .set({ Authorization: `Bearer ${userB.accessToken}` });

    expect(res.status).toBe(200);
    expect(res.body.subjects).toHaveLength(0);
  });

  it("rejects unauthenticated requests", async () => {
    const res = await request(app).get("/api/export");
    expect(res.status).toBe(401);
  });
});
