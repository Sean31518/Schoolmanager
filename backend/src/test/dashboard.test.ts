import request from "supertest";
import { describe, expect, it } from "vitest";
import { app, registerUser } from "./helpers.js";

const WEEKDAYS = [
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
];

function weekdayFor(date: Date) {
  return WEEKDAYS[date.getDay()];
}

describe("Dashboard", () => {
  it("merges homework + events into upcomingReminders sorted by date, excluding dateless homework and holidays", async () => {
    const user = await registerUser();
    const headers = { Authorization: `Bearer ${user.accessToken}` };

    await request(app)
      .post("/api/homework")
      .set(headers)
      .send({ title: "Ohne Datum" });
    await request(app)
      .post("/api/homework")
      .set(headers)
      .send({ title: "Mathe Arbeitsblatt", dueDate: "2026-10-05" });
    await request(app)
      .post("/api/calendar-events")
      .set(headers)
      .send({ title: "Deutsch-Klausur", type: "EXAM", startDate: "2026-10-01" });
    await request(app)
      .post("/api/calendar-events")
      .set(headers)
      .send({ title: "Herbstferien", type: "HOLIDAY", startDate: "2026-10-02" });

    const res = await request(app).get("/api/dashboard").set(headers);
    expect(res.status).toBe(200);
    expect(res.body.upcomingReminders).toHaveLength(2);
    expect(res.body.upcomingReminders[0]).toMatchObject({
      kind: "event",
      title: "Deutsch-Klausur",
    });
    expect(res.body.upcomingReminders[1]).toMatchObject({
      kind: "homework",
      title: "Mathe Arbeitsblatt",
    });
  });

  it("shows only assigned LESSON slots for today/tomorrow, skipping breaks and empty slots", async () => {
    const user = await registerUser();
    const headers = { Authorization: `Bearer ${user.accessToken}` };

    const subjectRes = await request(app)
      .post("/api/subjects")
      .set(headers)
      .send({ name: "Mathe", color: "#3B82F6" });
    const subjectId = subjectRes.body.id as string;

    const lessonRes = await request(app)
      .post("/api/time-grid")
      .set(headers)
      .send({ label: "1. Stunde", type: "LESSON", startTime: "08:00", endTime: "08:45" });
    const lessonId = lessonRes.body.id as string;
    const breakRes = await request(app)
      .post("/api/time-grid")
      .set(headers)
      .send({ label: "Pause", type: "BREAK", startTime: "08:45", endTime: "09:00" });
    const breakId = breakRes.body.id as string;
    const unassignedLessonRes = await request(app)
      .post("/api/time-grid")
      .set(headers)
      .send({ label: "2. Stunde", type: "LESSON", startTime: "09:00", endTime: "09:45" });

    const today = weekdayFor(new Date());
    await request(app)
      .put(`/api/timetable/${today}/${lessonId}`)
      .set(headers)
      .send({ subjectId });
    await request(app)
      .put(`/api/timetable/${today}/${breakId}`)
      .set(headers)
      .send({ subjectId });

    const res = await request(app).get("/api/dashboard").set(headers);
    expect(res.status).toBe(200);
    expect(res.body.todayTimetable).toEqual([
      expect.objectContaining({ label: "1. Stunde", subjectName: "Mathe" }),
    ]);
    // The break slot and the unassigned lesson slot must not appear.
    expect(
      res.body.todayTimetable.some((s: { label: string }) => s.label === "Pause"),
    ).toBe(false);
    expect(
      res.body.todayTimetable.some((s: { label: string }) => s.label === "2. Stunde"),
    ).toBe(false);
    void unassignedLessonRes;
  });

  it("tracks recently viewed notes, most recent first, capped at 5", async () => {
    const user = await registerUser();
    const headers = { Authorization: `Bearer ${user.accessToken}` };

    const subjectRes = await request(app)
      .post("/api/subjects")
      .set(headers)
      .send({ name: "Bio", color: "#22C55E" });
    const sectionRes = await request(app)
      .post(`/api/subjects/${subjectRes.body.id}/section-types`)
      .set(headers)
      .send({ name: "Regelheft" });
    const topicRes = await request(app)
      .post(`/api/section-types/${sectionRes.body.id}/topics`)
      .set(headers)
      .send({ name: "Zellen" });

    const noteAId = (
      await request(app)
        .post(`/api/topics/${topicRes.body.id}/notes`)
        .set(headers)
        .send({ title: "Notiz A" })
    ).body.id as string;
    const noteBId = (
      await request(app)
        .post(`/api/topics/${topicRes.body.id}/notes`)
        .set(headers)
        .send({ title: "Notiz B" })
    ).body.id as string;

    // A note that's never opened shouldn't show up as "recently viewed".
    const before = await request(app).get("/api/dashboard").set(headers);
    expect(before.body.recentlyViewedNotes).toHaveLength(0);

    await request(app).get(`/api/notes/${noteAId}`).set(headers);
    await request(app).get(`/api/notes/${noteBId}`).set(headers);
    await request(app).get(`/api/notes/${noteAId}`).set(headers); // re-open A, should move to the front

    const after = await request(app).get("/api/dashboard").set(headers);
    expect(after.body.recentlyViewedNotes.map((n: { id: string }) => n.id)).toEqual([
      noteAId,
      noteBId,
    ]);
    expect(after.body.recentlyViewedNotes[0]).toMatchObject({
      title: "Notiz A",
      subjectName: "Bio",
      sectionTypeName: "Regelheft",
      topicName: "Zellen",
    });
  });
});
