import request from "supertest";
import { describe, expect, it } from "vitest";
import { prisma } from "../lib/prisma.js";
import { getTimetable } from "../modules/timetable/timetable.service.js";
import { app, registerUser } from "./helpers.js";

describe("Timetable IServ overlay (current week only)", () => {
  it("always includes CANCELLED/CHANGED overrides for the current week, regardless of iservActive", async () => {
    const user = await registerUser();
    const headers = { Authorization: `Bearer ${user.accessToken}` };

    const lesson1 = await request(app)
      .post("/api/time-grid")
      .set(headers)
      .send({ label: "1. Stunde", type: "LESSON", startTime: "08:00", endTime: "08:45" });

    // 2026-09-21 is a Monday.
    const monday = new Date("2026-09-21T10:00:00Z");
    await prisma.timetableOverride.create({
      data: {
        userId: user.userId,
        date: new Date("2026-09-21T00:00:00.000Z"),
        timeGridSlotId: lesson1.body.id,
        type: "CANCELLED",
        teacherName: "Erika Musterfrau",
        teacherAcronym: "MUS",
        courseName: "Kurs-1",
        startTime: "08:00",
        endTime: "08:45",
      },
    });

    const timetable = await getTimetable(user.userId, monday);
    expect(timetable.iservOverlay).toEqual([
      {
        weekday: "MONDAY",
        timeGridSlotId: lesson1.body.id,
        type: "CANCELLED",
        subjectName: null,
        subjectId: null,
        subjectColor: null,
        rawSubjectCode: null,
        room: null,
        startTime: "08:00",
        endTime: "08:45",
        teacherName: "Erika Musterfrau",
        teacherAcronym: "MUS",
        courseName: "Kurs-1",
      },
    ]);
  });

  it("uses the linked Subject's own color/name over whatever's manually assigned in the same slot", async () => {
    const user = await registerUser();
    const headers = { Authorization: `Bearer ${user.accessToken}` };

    const mathe = await request(app)
      .post("/api/subjects")
      .set(headers)
      .send({ name: "Mathe", color: "#3B82F6" });
    const englisch = await request(app)
      .post("/api/subjects")
      .set(headers)
      .send({ name: "Englisch", color: "#22C55E" });
    const lesson1 = await request(app)
      .post("/api/time-grid")
      .set(headers)
      .send({ label: "1. Stunde", type: "LESSON", startTime: "08:00", endTime: "08:45" });

    // The manual plan (coincidentally) has Mathe here - the override should
    // still show Englisch's own color, not Mathe's.
    const monday = new Date("2026-09-21T10:00:00Z");
    await request(app)
      .put(`/api/timetable/MONDAY/${lesson1.body.id}`)
      .set(headers)
      .send({ subjectId: mathe.body.id });
    await prisma.timetableOverride.create({
      data: {
        userId: user.userId,
        date: new Date("2026-09-21T00:00:00.000Z"),
        timeGridSlotId: lesson1.body.id,
        type: "CHANGED",
        subjectName: "Englisch",
        subjectId: englisch.body.id,
        rawSubjectCode: "E1",
        room: "R204",
      },
    });

    const timetable = await getTimetable(user.userId, monday);
    expect(timetable.iservOverlay).toEqual([
      expect.objectContaining({
        subjectName: "Englisch",
        subjectId: englisch.body.id,
        subjectColor: "#22C55E",
        rawSubjectCode: "E1",
      }),
    ]);
  });

  it("only includes NORMAL overrides while iservActive is currently on", async () => {
    const user = await registerUser();
    const headers = { Authorization: `Bearer ${user.accessToken}` };

    const lesson1 = await request(app)
      .post("/api/time-grid")
      .set(headers)
      .send({ label: "1. Stunde", type: "LESSON", startTime: "08:00", endTime: "08:45" });

    const monday = new Date("2026-09-21T10:00:00Z");
    await prisma.timetableOverride.create({
      data: {
        userId: user.userId,
        date: new Date("2026-09-22T00:00:00.000Z"), // Tuesday, same week
        timeGridSlotId: lesson1.body.id,
        type: "NORMAL",
        subjectName: "Englisch",
        room: "R204",
      },
    });

    const before = await getTimetable(user.userId, monday);
    expect(before.iservOverlay).toHaveLength(0);

    await request(app).patch("/api/settings").set(headers).send({ iservActive: true });

    const after = await getTimetable(user.userId, monday);
    expect(after.iservOverlay).toEqual([
      expect.objectContaining({ weekday: "TUESDAY", type: "NORMAL", subjectName: "Englisch", room: "R204" }),
    ]);
  });

  it("excludes overrides from a different calendar week", async () => {
    const user = await registerUser();
    const headers = { Authorization: `Bearer ${user.accessToken}` };

    const lesson1 = await request(app)
      .post("/api/time-grid")
      .set(headers)
      .send({ label: "1. Stunde", type: "LESSON", startTime: "08:00", endTime: "08:45" });

    // 2026-09-14 is the Monday of the PREVIOUS week.
    await prisma.timetableOverride.create({
      data: {
        userId: user.userId,
        date: new Date("2026-09-14T00:00:00.000Z"),
        timeGridSlotId: lesson1.body.id,
        type: "CANCELLED",
      },
    });

    const monday = new Date("2026-09-21T10:00:00Z");
    const timetable = await getTimetable(user.userId, monday);
    expect(timetable.iservOverlay).toHaveLength(0);
  });
});
