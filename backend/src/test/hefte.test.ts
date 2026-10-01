import request from "supertest";
import { describe, expect, it } from "vitest";
import { matchPages, relocatePage } from "../lib/pageRelocation.js";
import { createDavHandler } from "../modules/dav/dav.server.js";
import { waitForProcessingIdle } from "../modules/dav/davProcessing.js";
import { resolveSubject } from "../modules/hefte/subjectMatching.js";
import { app, makePdf, registerDavUser } from "./helpers.js";

const dav = createDavHandler();

async function upload(auth: string, path: string, labels: string[]) {
  const res = await request(dav)
    .put(path)
    .set("Authorization", auth)
    .send(await makePdf(labels));
  expect([201, 204]).toContain(res.status);
  await waitForProcessingIdle();
}

describe("Fach assignment from Goodnotes paths", () => {
  const subjects = [
    { id: "mathe", name: "Mathe" },
    { id: "franz", name: "Französisch" },
    { id: "deutsch", name: "Deutsch" },
  ];

  it("uses the innermost folder named like a Fach, ignoring leading numbers", () => {
    expect(resolveSubject("GoodNotes/Schule/Abitur/Q1/Mathe/Analysis.pdf", subjects, new Map())).toMatchObject({
      subjectId: "mathe",
      source: "folder",
    });
    expect(resolveSubject("GoodNotes/Archiv/9c/1 Französisch/Vokabeln.pdf", subjects, new Map()).subjectId).toBe(
      "franz",
    );
    expect(resolveSubject("GoodNotes/Deutsch/Mathe/Heft.pdf", subjects, new Map()).subjectId).toBe("mathe");
  });

  it("falls back to the Heft's own name, then to a manual folder assignment", () => {
    expect(resolveSubject("GoodNotes/Q3/Mathe.pdf", subjects, new Map())).toMatchObject({
      subjectId: "mathe",
      source: "name",
    });
    const manual = new Map([["GoodNotes/Sonstiges", "deutsch"]]);
    expect(resolveSubject("GoodNotes/Sonstiges/Lektüre/Faust.pdf", subjects, manual)).toMatchObject({
      subjectId: "deutsch",
      source: "manual",
      folderPath: "GoodNotes/Sonstiges",
    });
    expect(resolveSubject("GoodNotes/Zentrale.pdf", subjects, manual).subjectId).toBeNull();
  });
});

describe("Page relocation", () => {
  it("follows pages across insertions and in-place edits", () => {
    const old = ["a", "b", "c", "d"];
    const inserted = ["a", "new", "b", "c", "d"];
    const matches = matchPages(old, inserted);
    expect(relocatePage(2, matches, 4, 5)).toEqual({ index: 3, uncertain: false });

    // Page c was written on: no match, but its neighbours didn't move.
    const edited = ["a", "b", "c2", "d"];
    expect(relocatePage(2, matchPages(old, edited), 4, 4)).toEqual({ index: 2, uncertain: false });

    // Page c was written on AND a page was inserted right before it: the
    // gap between b and d grew, so it's only a guess.
    const both = ["a", "b", "new", "c2", "d"];
    expect(relocatePage(2, matchPages(old, both), 4, 5).uncertain).toBe(true);
  });
});

describe("Hefte API and links", () => {
  it("lists Hefte with their Fach and lets the user assign a folder by hand", async () => {
    const user = await registerDavUser();
    const headers = { Authorization: `Bearer ${user.accessToken}` };
    const mathe = await request(app).post("/api/subjects").set(headers).send({ name: "Mathe", color: "#3B82F6" });
    const bio = await request(app).post("/api/subjects").set(headers).send({ name: "Bio", color: "#22C55E" });

    await request(dav).mkcol("/GoodNotes").set("Authorization", user.davAuth);
    await request(dav).mkcol("/GoodNotes/Q1").set("Authorization", user.davAuth);
    await request(dav).mkcol("/GoodNotes/Natur").set("Authorization", user.davAuth);
    await upload(user.davAuth, "/GoodNotes/Q1/Mathe.pdf", ["A", "B"]);
    await upload(user.davAuth, "/GoodNotes/Natur/Zellen.pdf", ["A"]);

    const list = await request(app).get("/api/hefte").set(headers);
    expect(list.status).toBe(200);
    const byName = Object.fromEntries(list.body.map((h: { name: string }) => [h.name, h]));
    expect(byName.Mathe).toMatchObject({ pageCount: 2, subject: { id: mathe.body.id }, subjectSource: "name" });
    expect(byName.Zellen.subject).toBeNull();

    const assign = await request(app)
      .put("/api/hefte/folders/subject")
      .set(headers)
      .send({ folderPath: "GoodNotes/Natur", subjectId: bio.body.id });
    expect(assign.status).toBe(204);
    const bioHefte = await request(app).get(`/api/hefte?subjectId=${bio.body.id}`).set(headers);
    expect(bioHefte.body.map((h: { name: string }) => h.name)).toEqual(["Zellen"]);

    // Archiving hides it; a new upload from Goodnotes brings it back.
    await request(app).patch(`/api/hefte/${byName.Zellen.id}`).set(headers).send({ archived: true });
    expect((await request(app).get("/api/hefte").set(headers)).body).toHaveLength(1);
    await upload(user.davAuth, "/GoodNotes/Natur/Zellen.pdf", ["A", "B"]);
    expect((await request(app).get("/api/hefte").set(headers)).body).toHaveLength(2);

    const pdf = await request(app).get(`/api/hefte/${byName.Mathe.id}/pdf`).set(headers).set("Range", "bytes=0-3");
    expect(pdf.status).toBe(206);
  });

  it("moves a homework's page link along when pages are inserted, and flags guesses as unsicher", async () => {
    const user = await registerDavUser();
    const headers = { Authorization: `Bearer ${user.accessToken}` };
    await upload(user.davAuth, "/Heft.pdf", ["A", "B", "C", "D"]);
    const [heft] = (await request(app).get("/api/hefte").set(headers)).body;

    const created = await request(app)
      .post("/api/homework")
      .set(headers)
      .send({ title: "Lernen", links: [{ fileId: heft.id, pageStart: 3, pageEnd: 4 }, { fileId: heft.id }] });
    expect(created.status).toBe(201);
    expect(created.body.links).toEqual([
      expect.objectContaining({ heftName: "Heft", pageStart: 3, pageEnd: 4, uncertain: false }),
      expect.objectContaining({ pageStart: null, pageEnd: null }),
    ]);

    // Two pages inserted at the front.
    await upload(user.davAuth, "/Heft.pdf", ["X", "Y", "A", "B", "C", "D"]);
    let homework = (await request(app).get("/api/homework").set(headers)).body[0];
    expect(homework.links[0]).toMatchObject({ pageStart: 5, pageEnd: 6, uncertain: false });

    // Page C rewritten and a page inserted right before it: only a guess.
    await upload(user.davAuth, "/Heft.pdf", ["X", "Y", "A", "B", "NEU", "C2", "D"]);
    homework = (await request(app).get("/api/homework").set(headers)).body[0];
    expect(homework.links[0]).toMatchObject({ pageStart: 5, uncertain: true });

    // The user fixes the range; then confirms another guess.
    const fixed = await request(app)
      .patch(`/api/homework/${homework.id}`)
      .set(headers)
      .send({
        links: [
          { id: homework.links[0].id, fileId: heft.id, pageStart: 6, pageEnd: 7 },
          { id: homework.links[1].id, fileId: heft.id },
        ],
      });
    expect(fixed.body.links[0]).toMatchObject({ pageStart: 6, pageEnd: 7, uncertain: false });
    expect(fixed.body.links[1].id).toBe(homework.links[1].id);

    const confirmed = await request(app).post(`/api/links/${fixed.body.links[0].id}/confirm`).set(headers);
    expect(confirmed.body.uncertain).toBe(false);
  });

  it("rejects links to another user's Heft", async () => {
    const owner = await registerDavUser();
    const other = await registerDavUser();
    await upload(owner.davAuth, "/Heft.pdf", ["A"]);
    const [heft] = (await request(app).get("/api/hefte").set({ Authorization: `Bearer ${owner.accessToken}` })).body;

    const res = await request(app)
      .post("/api/homework")
      .set({ Authorization: `Bearer ${other.accessToken}` })
      .send({ title: "Fremd", links: [{ fileId: heft.id }] });
    expect(res.status).toBe(404);
    expect(
      (await request(app).get(`/api/hefte/${heft.id}/pdf`).set({ Authorization: `Bearer ${other.accessToken}` }))
        .status,
    ).toBe(404);
  });

  it("links Klausuren, Dashboard-Notizen and Karteikarten in Stapeln", async () => {
    const user = await registerDavUser();
    const headers = { Authorization: `Bearer ${user.accessToken}` };
    await upload(user.davAuth, "/Mathe.pdf", ["A", "B"]);
    const [heft] = (await request(app).get("/api/hefte").set(headers)).body;
    const subject = await request(app).post("/api/subjects").set(headers).send({ name: "Mathe", color: "#3B82F6" });

    const exam = await request(app)
      .post("/api/calendar-events")
      .set(headers)
      .send({ title: "Klausur", type: "EXAM", startDate: "2030-01-10", links: [{ fileId: heft.id, pageStart: 2 }] });
    expect(exam.body.links[0]).toMatchObject({ pageStart: 2, pageEnd: 2 });

    const note = await request(app)
      .post("/api/general-notes")
      .set(headers)
      .send({ contentJson: { type: "doc", content: [] }, links: [{ fileId: heft.id }] });
    expect(note.body.links).toHaveLength(1);
    const dashboard = await request(app).get("/api/dashboard").set(headers);
    expect(dashboard.body.generalNotes[0].links).toHaveLength(1);

    const deck = await request(app).post(`/api/subjects/${subject.body.id}/decks`).set(headers).send({ name: "Formeln" });
    expect(deck.status).toBe(201);
    const card = await request(app)
      .post(`/api/decks/${deck.body.id}/flashcards`)
      .set(headers)
      .send({ question: "Ableitung von x²?", answer: "2x", links: [{ fileId: heft.id, pageStart: 1 }] });
    expect(card.body.links[0]).toMatchObject({ pageStart: 1 });
    await request(app).post(`/api/flashcards/${card.body.id}/review`).set(headers).send({ result: "known" });

    const decks = await request(app).get("/api/decks").set(headers);
    expect(decks.body[0]).toMatchObject({ name: "Formeln", cardCount: 1, knownCount: 1 });
    const full = await request(app).get(`/api/decks/${deck.body.id}`).set(headers);
    expect(full.body.flashcards[0].links[0].heftName).toBe("Mathe");
  });
});
