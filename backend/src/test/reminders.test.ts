import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { sendToUser, isPushConfigured } = vi.hoisted(() => ({
  sendToUser: vi.fn().mockResolvedValue(undefined),
  isPushConfigured: vi.fn().mockReturnValue(true),
}));

vi.mock("../modules/push/push.service.js", () => ({
  isPushConfigured,
  sendToUser,
  getVapidPublicKey: () => "fake",
  hasActiveSubscription: async () => true,
  saveSubscription: async () => undefined,
  removeSubscription: async () => undefined,
}));

const { runReminderCheck } = await import("../modules/reminders/reminders.service.js");
const { app, registerUser } = await import("./helpers.js");

function daysFromNow(base: Date, days: number) {
  const d = new Date(base);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// The suite's SQLite test.db persists across every test file run in the
// same `vitest run` invocation, so other files' fixture data (exams,
// homework) is still present when this file runs. runReminderCheck legitimately
// scans across all users, so assertions filter to the specific test's own
// freshly-registered (guaranteed-unique) user instead of asserting global
// call counts, which would be flaky depending on run order/other suites.
function callsForUser(userId: string) {
  return sendToUser.mock.calls.filter((call) => call[0] === userId);
}

describe("Reminder checks", () => {
  beforeEach(() => {
    sendToUser.mockClear();
    isPushConfigured.mockReturnValue(true);
  });

  it("notifies for an exam exactly 3 or 1 days out, but not other days", async () => {
    const user = await registerUser();
    const headers = { Authorization: `Bearer ${user.accessToken}` };
    const now = new Date();

    await request(app)
      .post("/api/calendar-events")
      .set(headers)
      .send({ title: "In 3 Tagen", type: "EXAM", startDate: daysFromNow(now, 3) });
    await request(app)
      .post("/api/calendar-events")
      .set(headers)
      .send({ title: "Morgen", type: "EXAM", startDate: daysFromNow(now, 1) });
    await request(app)
      .post("/api/calendar-events")
      .set(headers)
      .send({ title: "In 5 Tagen", type: "EXAM", startDate: daysFromNow(now, 5) });

    await runReminderCheck(now);

    const calls = callsForUser(user.userId);
    expect(calls).toHaveLength(2);
    const bodies = calls.map((call) => (call[1] as { body: string }).body);
    expect(bodies.some((b) => b.includes("In 3 Tagen"))).toBe(true);
    expect(bodies.some((b) => b.includes("Morgen"))).toBe(true);
    expect(bodies.some((b) => b.includes("In 5 Tagen"))).toBe(false);
  });

  it("never sends the same reminder twice, even across repeated checks", async () => {
    const user = await registerUser();
    const headers = { Authorization: `Bearer ${user.accessToken}` };
    const now = new Date();

    await request(app)
      .post("/api/calendar-events")
      .set(headers)
      .send({ title: "Wiederholung", type: "EXAM", startDate: daysFromNow(now, 1) });

    await runReminderCheck(now);
    await runReminderCheck(now);

    expect(callsForUser(user.userId)).toHaveLength(1);
  });

  it("notifies for homework due tomorrow, not for homework due later", async () => {
    const user = await registerUser();
    const headers = { Authorization: `Bearer ${user.accessToken}` };
    const now = new Date();

    await request(app)
      .post("/api/homework")
      .set(headers)
      .send({ title: "Übungsblatt", dueDate: daysFromNow(now, 1) });
    await request(app)
      .post("/api/homework")
      .set(headers)
      .send({ title: "Übungsblatt spät", dueDate: daysFromNow(now, 4) });

    await runReminderCheck(now);

    const calls = callsForUser(user.userId);
    expect(calls).toHaveLength(1);
    expect((calls[0][1] as { body: string }).body).toContain("Übungsblatt");
  });

  it("does not notify for homework that's already marked done", async () => {
    const user = await registerUser();
    const headers = { Authorization: `Bearer ${user.accessToken}` };
    const now = new Date();

    const hwRes = await request(app)
      .post("/api/homework")
      .set(headers)
      .send({ title: "Erledigt", dueDate: daysFromNow(now, 1) });
    await request(app)
      .patch(`/api/homework/${hwRes.body.id}`)
      .set(headers)
      .send({ done: true });

    await runReminderCheck(now);

    expect(callsForUser(user.userId)).toHaveLength(0);
  });

  it("does nothing at all when push isn't server-configured", async () => {
    isPushConfigured.mockReturnValueOnce(false);

    const user = await registerUser();
    const headers = { Authorization: `Bearer ${user.accessToken}` };
    const now = new Date();
    await request(app)
      .post("/api/calendar-events")
      .set(headers)
      .send({ title: "Sollte nicht senden", type: "EXAM", startDate: daysFromNow(now, 1) });

    await runReminderCheck(now);

    expect(callsForUser(user.userId)).toHaveLength(0);
  });
});
