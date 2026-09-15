import request from "supertest";
import { describe, expect, it } from "vitest";
import { app, registerUser } from "./helpers.js";

async function setupSubjectWithNote(
  headers: Record<string, string>,
  noteContent: unknown,
  gradeLevel = 7,
) {
  const subjectRes = await request(app)
    .post("/api/subjects")
    .set(headers)
    .send({ name: "Mathe", color: "#3B82F6" });
  const subjectId = subjectRes.body.id as string;

  const sectionRes = await request(app)
    .post(`/api/subjects/${subjectId}/section-types`)
    .set(headers)
    .send({ name: "Regelheft" });
  const sectionTypeId = sectionRes.body.id as string;

  const topicRes = await request(app)
    .post(`/api/section-types/${sectionTypeId}/topics`)
    .set(headers)
    .send({ name: "Wellen", gradeLevel });
  const topicId = topicRes.body.id as string;

  const noteRes = await request(app)
    .post(`/api/topics/${topicId}/notes`)
    .set(headers)
    .send({ title: "Wellen Notiz", contentJson: noteContent });

  return { subjectId, sectionTypeId, topicId, noteId: noteRes.body.id as string };
}

const SAMPLE_DOC = {
  type: "doc",
  content: [
    { type: "paragraph", content: [{ type: "text", text: "Intro" }] },
    { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Bruchrechnung" }] },
    { type: "paragraph", content: [{ type: "text", text: "Regel 1" }] },
    { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Prozentrechnung" }] },
    { type: "paragraph", content: [{ type: "text", text: "Regel 2" }] },
  ],
};

describe("Exam prep", () => {
  it("creates an exam event with a subject, saves a section selection, and reads it back", async () => {
    const user = await registerUser();
    const headers = { Authorization: `Bearer ${user.accessToken}` };
    const { subjectId, noteId } = await setupSubjectWithNote(headers, SAMPLE_DOC);

    const eventRes = await request(app)
      .post("/api/calendar-events")
      .set(headers)
      .send({ title: "Mathe-Klausur", type: "EXAM", startDate: "2026-10-01", subjectId });
    expect(eventRes.status).toBe(201);
    expect(eventRes.body.subject.id).toBe(subjectId);
    const eventId = eventRes.body.id as string;

    const candidatesRes = await request(app)
      .get(`/api/calendar-events/${eventId}/exam-prep/candidates`)
      .set(headers);
    expect(candidatesRes.status).toBe(200);
    expect(candidatesRes.body).toHaveLength(1);
    expect(candidatesRes.body[0].noteId).toBe(noteId);
    expect(candidatesRes.body[0].subjectId).toBe(subjectId);

    const saveRes = await request(app)
      .put(`/api/calendar-events/${eventId}/exam-prep`)
      .set(headers)
      .send({
        items: [{ noteId, sectionIndex: 1, sectionLabel: "Bruchrechnung" }],
      });
    expect(saveRes.status).toBe(200);
    expect(saveRes.body.items).toHaveLength(1);

    const getRes = await request(app)
      .get(`/api/calendar-events/${eventId}/exam-prep`)
      .set(headers);
    expect(getRes.status).toBe(200);
    expect(getRes.body.items).toHaveLength(1);
    expect(getRes.body.items[0]).toMatchObject({
      sectionIndex: 1,
      sectionLabel: "Bruchrechnung",
      noteId,
      subjectId,
    });

    // Replacing the selection drops the old item.
    const replaceRes = await request(app)
      .put(`/api/calendar-events/${eventId}/exam-prep`)
      .set(headers)
      .send({ items: [{ noteId, sectionIndex: 3, sectionLabel: "Prozentrechnung" }] });
    expect(replaceRes.body.items).toHaveLength(1);
    expect(replaceRes.body.items[0].sectionIndex).toBe(3);
  });

  it("scopes candidates to the exam's subject unless allSubjects=true", async () => {
    const user = await registerUser();
    const headers = { Authorization: `Bearer ${user.accessToken}` };
    const { subjectId, noteId } = await setupSubjectWithNote(headers, SAMPLE_DOC);

    // A second subject with its own note.
    const otherSubjectRes = await request(app)
      .post("/api/subjects")
      .set(headers)
      .send({ name: "Deutsch", color: "#EF4444" });
    const otherSubjectId = otherSubjectRes.body.id as string;
    const otherSectionRes = await request(app)
      .post(`/api/subjects/${otherSubjectId}/section-types`)
      .set(headers)
      .send({ name: "Regelheft" });
    const otherTopicRes = await request(app)
      .post(`/api/section-types/${otherSectionRes.body.id}/topics`)
      .set(headers)
      .send({ name: "Grammatik", gradeLevel: 7 });
    await request(app)
      .post(`/api/topics/${otherTopicRes.body.id}/notes`)
      .set(headers)
      .send({ title: "Grammatik Notiz", contentJson: SAMPLE_DOC });

    const eventRes = await request(app)
      .post("/api/calendar-events")
      .set(headers)
      .send({ title: "Mathe-Klausur", type: "EXAM", startDate: "2026-10-01", subjectId });
    const eventId = eventRes.body.id as string;

    const scoped = await request(app)
      .get(`/api/calendar-events/${eventId}/exam-prep/candidates`)
      .set(headers);
    expect(scoped.body.map((n: { noteId: string }) => n.noteId)).toEqual([noteId]);

    const broadened = await request(app)
      .get(`/api/calendar-events/${eventId}/exam-prep/candidates?allSubjects=true`)
      .set(headers);
    expect(broadened.body).toHaveLength(2);
  });

  it("prevents user B from reading, saving, or listing candidates for user A's exam prep", async () => {
    const userA = await registerUser();
    const userB = await registerUser();
    const aHeaders = { Authorization: `Bearer ${userA.accessToken}` };
    const bHeaders = { Authorization: `Bearer ${userB.accessToken}` };
    const { noteId } = await setupSubjectWithNote(aHeaders, SAMPLE_DOC);

    const eventRes = await request(app)
      .post("/api/calendar-events")
      .set(aHeaders)
      .send({ title: "Mathe-Klausur", type: "EXAM", startDate: "2026-10-01" });
    const eventId = eventRes.body.id as string;

    expect(
      (await request(app).get(`/api/calendar-events/${eventId}/exam-prep`).set(bHeaders)).status,
    ).toBe(404);
    expect(
      (
        await request(app)
          .get(`/api/calendar-events/${eventId}/exam-prep/candidates`)
          .set(bHeaders)
      ).status,
    ).toBe(404);
    expect(
      (
        await request(app)
          .put(`/api/calendar-events/${eventId}/exam-prep`)
          .set(bHeaders)
          .send({ items: [{ noteId, sectionIndex: 0, sectionLabel: "x" }] })
      ).status,
    ).toBe(404);

    // User B also can't smuggle in user A's note under their own exam event.
    const bEventRes = await request(app)
      .post("/api/calendar-events")
      .set(bHeaders)
      .send({ title: "Fremde Klausur", type: "EXAM", startDate: "2026-10-02" });
    const bEventId = bEventRes.body.id as string;
    expect(
      (
        await request(app)
          .put(`/api/calendar-events/${bEventId}/exam-prep`)
          .set(bHeaders)
          .send({ items: [{ noteId, sectionIndex: 0, sectionLabel: "x" }] })
      ).status,
    ).toBe(404);
  });
});
