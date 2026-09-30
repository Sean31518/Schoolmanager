import request from "supertest";
import { describe, expect, it } from "vitest";
import { importUserData } from "../modules/export/export.service.js";
import { importDataSchema } from "../modules/export/export.schema.js";
import { prisma } from "../lib/prisma.js";
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

    const deck = await prisma.flashcardDeck.create({
      data: { userId: source.userId, subjectId, name: "Vokabeln" },
    });
    await prisma.flashcard.create({ data: { deckId: deck.id, question: "2+2", answer: "4" } });

    await request(app)
      .post("/api/calendar-events")
      .set(sourceHeaders)
      .send({ title: "Mathe-Klausur", type: "EXAM", startDate: "2026-10-01", subjectId });

    await request(app)
      .post("/api/homework")
      .set(sourceHeaders)
      .send({ title: "Übungsblatt 3", subjectId });

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
      flashcardDecks: 1,
      flashcards: 1,
      calendarEvents: 1,
      homework: 1,
      generalNotes: 1,
    });

    const reExport = await request(app).get("/api/export").set(targetHeaders);
    expect(reExport.body.subjects).toHaveLength(1);
    const importedSubject = reExport.body.subjects[0];
    expect(importedSubject.name).toBe("Mathe");
    expect(importedSubject.flashcardDecks[0].flashcards[0]).toMatchObject({
      question: "2+2",
      answer: "4",
    });
    // Cross-references must point at the newly created subject in the
    // target account, not the (meaningless there) original ID.
    expect(reExport.body.homework[0].subjectId).toBe(importedSubject.id);
    expect(reExport.body.calendarEvents[0].subjectId).toBe(importedSubject.id);
  });

  it("reuses an existing subject by name instead of duplicating it, but still adds nested decks", async () => {
    const user = await registerUser();
    const headers = { Authorization: `Bearer ${user.accessToken}` };

    const payload = importDataSchema.parse({
      version: 2,
      subjects: [
        {
          id: "old-subject-1",
          name: "Mathe",
          color: "#3B82F6",
          flashcardDecks: [{ name: "Formeln", flashcards: [{ question: "a", answer: "b" }] }],
        },
      ],
    });

    await importUserData(user.userId, payload);
    const secondRun = await importUserData(user.userId, payload);

    expect(secondRun.subjects).toBe(0);
    expect(secondRun.flashcardDecks).toBe(1);

    const res = await request(app).get("/api/export").set(headers);
    expect(res.body.subjects).toHaveLength(1);
    expect(res.body.subjects[0].flashcardDecks).toHaveLength(2);
  });

  it("still imports everything else from an old version-1 export that contains notes", async () => {
    const user = await registerUser();

    const payload = importDataSchema.parse({
      version: 1,
      subjects: [
        {
          id: "s1",
          name: "Mathe",
          color: "#3B82F6",
          noteSectionTypes: [{ name: "Regelheft", topics: [{ name: "Brüche", notes: [] }] }],
        },
      ],
      homework: [{ title: "Alt", subjectId: "s1", linkedNoteId: "n1" }],
    });

    const summary = await importUserData(user.userId, payload);
    expect(summary).toMatchObject({ subjects: 1, homework: 1, flashcardDecks: 0 });
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
