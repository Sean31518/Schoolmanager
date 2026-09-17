import request from "supertest";
import { describe, expect, it } from "vitest";
import { importUserData } from "../modules/export/export.service.js";
import { importDataSchema } from "../modules/export/export.schema.js";
import { app, registerUser } from "./helpers.js";

describe("Data import", () => {
  it("round-trips a full export into a different account", async () => {
    const source = await registerUser();
    const sourceHeaders = { Authorization: `Bearer ${source.accessToken}` };

    const subjectRes = await request(app)
      .post("/api/subjects")
      .set(sourceHeaders)
      .send({ name: "Mathe", color: "#3B82F6" });
    const subjectId = subjectRes.body.id as string;

    const sectionTypeRes = await request(app)
      .post(`/api/subjects/${subjectId}/section-types`)
      .set(sourceHeaders)
      .send({ name: "Regelheft" });
    const sectionTypeId = sectionTypeRes.body.id as string;

    const topicRes = await request(app)
      .post(`/api/section-types/${sectionTypeId}/topics`)
      .set(sourceHeaders)
      .send({ name: "Bruchrechnung" });
    const topicId = topicRes.body.id as string;

    const noteRes = await request(app)
      .post(`/api/topics/${topicId}/notes`)
      .set(sourceHeaders)
      .send({ title: "Merksätze" });
    const noteId = noteRes.body.id as string;

    await request(app)
      .post(`/api/notes/${noteId}/blocks/text`)
      .set(sourceHeaders)
      .send({ contentJson: { type: "doc", content: [{ type: "paragraph" }] } });

    const eventRes = await request(app)
      .post("/api/calendar-events")
      .set(sourceHeaders)
      .send({ title: "Mathe-Klausur", type: "EXAM", startDate: "2026-10-01" });
    const eventId = eventRes.body.id as string;

    await request(app)
      .put(`/api/calendar-events/${eventId}/exam-prep`)
      .set(sourceHeaders)
      .send({ items: [{ noteId, sectionIndex: 0, sectionLabel: "Merksätze" }] });

    await request(app)
      .post("/api/homework")
      .set(sourceHeaders)
      .send({ title: "Übungsblatt 3", subjectId, linkedNoteId: noteId });

    await request(app)
      .post("/api/general-notes")
      .set(sourceHeaders)
      .send({ contentJson: { type: "doc", content: [] } });

    const exportRes = await request(app).get("/api/export").set(sourceHeaders);
    expect(exportRes.status).toBe(200);

    // Import into a fresh, unrelated account.
    const target = await registerUser();
    const targetHeaders = { Authorization: `Bearer ${target.accessToken}` };

    const importRes = await request(app)
      .post("/api/import")
      .set(targetHeaders)
      .send(exportRes.body);

    expect(importRes.status).toBe(200);
    expect(importRes.body.summary).toMatchObject({
      subjects: 1,
      noteSectionTypes: 1,
      topics: 1,
      notes: 1,
      calendarEvents: 1,
      examPrepItems: 1,
      homework: 1,
      generalNotes: 1,
    });

    const reExport = await request(app).get("/api/export").set(targetHeaders);
    expect(reExport.body.subjects).toHaveLength(1);
    expect(reExport.body.subjects[0].name).toBe("Mathe");
    const importedNote =
      reExport.body.subjects[0].noteSectionTypes[0].topics[0].notes[0];
    expect(importedNote.title).toBe("Merksätze");
    // createNote auto-creates an initial empty TEXT block, plus the one we
    // explicitly added via /blocks/text.
    expect(importedNote.blocks).toHaveLength(2);
    expect(
      importedNote.blocks.map((b: { contentJson: unknown }) => b.contentJson),
    ).toContainEqual({ type: "doc", content: [{ type: "paragraph" }] });
    expect(reExport.body.calendarEvents[0].examPrepItems).toHaveLength(1);
    // The linked note reference must point at the newly created note in the
    // target account, not the (meaningless there) original note ID.
    expect(reExport.body.homework[0].linkedNoteId).toBe(importedNote.id);
  });

  it("reuses an existing subject/Heft by name instead of duplicating it, but still adds nested content", async () => {
    const user = await registerUser();
    const headers = { Authorization: `Bearer ${user.accessToken}` };

    const payload = importDataSchema.parse({
      version: 1,
      subjects: [
        {
          id: "old-subject-1",
          name: "Mathe",
          color: "#3B82F6",
          noteSectionTypes: [
            {
              name: "Regelheft",
              topics: [{ name: "Bruchrechnung", notes: [] }],
            },
          ],
        },
      ],
    });

    await importUserData(user.userId, payload);
    const secondRun = await importUserData(user.userId, payload);

    // Second run should reuse the existing Subject and NoteSectionType...
    expect(secondRun.subjects).toBe(0);
    expect(secondRun.noteSectionTypes).toBe(0);
    // ...but Topic has no unique constraint, so it's added again as-is.
    expect(secondRun.topics).toBe(1);

    const res = await request(app).get("/api/export").set(headers);
    expect(res.body.subjects).toHaveLength(1);
    expect(res.body.subjects[0].noteSectionTypes).toHaveLength(1);
    expect(res.body.subjects[0].noteSectionTypes[0].topics).toHaveLength(2);
  });

  it("skips note blocks that depend on a file the export doesn't include", async () => {
    const user = await registerUser();

    const payload = importDataSchema.parse({
      version: 1,
      subjects: [
        {
          id: "s1",
          name: "Mathe",
          color: "#3B82F6",
          noteSectionTypes: [
            {
              name: "Regelheft",
              topics: [
                {
                  name: "Bruchrechnung",
                  notes: [
                    {
                      id: "n1",
                      title: "Merksätze",
                      blocks: [
                        { type: "TEXT", contentJson: { type: "doc", content: [] } },
                        { type: "IMAGE", fileId: "gone" },
                        { type: "PDF_PAGE", fileId: "gone", pageNumber: 1 },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });

    const summary = await importUserData(user.userId, payload);
    expect(summary.notes).toBe(1);
    expect(summary.blocksSkipped).toBe(2);
  });

  it("rejects a malformed import payload", async () => {
    const user = await registerUser();
    const res = await request(app)
      .post("/api/import")
      .set({ Authorization: `Bearer ${user.accessToken}` })
      .send({ notAnExport: true });

    expect(res.status).toBe(400);
  });

  it("rejects unauthenticated import requests", async () => {
    const res = await request(app).post("/api/import").send({ version: 1 });
    expect(res.status).toBe(401);
  });
});
