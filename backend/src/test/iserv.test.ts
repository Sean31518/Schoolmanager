import request from "supertest";
import { describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret } from "../lib/credentialsCrypto.js";
import type { IServChangeInfo, IServPeriod } from "../modules/iserv/iservClient.js";
import { mapPeriodsToOverrides, syncTimeGridFromIserv } from "../modules/iserv/iservSync.service.js";
import { prisma } from "../lib/prisma.js";
import { app, registerUser } from "./helpers.js";

const BASE_DETAILS = {
  startTime: "08:00",
  endTime: "08:45",
  teacherName: "Erika Musterfrau",
  teacherAcronym: "MUS",
  courseName: "Kurs-1",
};

function period(p: {
  period: number;
  subject: string;
  room: string;
  change: IServChangeInfo | null;
}): IServPeriod {
  return { label: null, ...BASE_DETAILS, ...p };
}

describe("Credentials encryption", () => {
  it("round-trips a secret", () => {
    const encrypted = encryptSecret("mein-iserv-passwort");
    expect(encrypted).not.toContain("mein-iserv-passwort");
    expect(decryptSecret(encrypted)).toBe("mein-iserv-passwort");
  });

  it("produces a different ciphertext each time (random IV)", () => {
    const a = encryptSecret("gleiches-passwort");
    const b = encryptSecret("gleiches-passwort");
    expect(a).not.toBe(b);
    expect(decryptSecret(a)).toBe("gleiches-passwort");
    expect(decryptSecret(b)).toBe("gleiches-passwort");
  });

  it("fails to decrypt tampered ciphertext instead of returning garbage", () => {
    const encrypted = encryptSecret("mein-iserv-passwort");
    const [iv, authTag, ciphertext] = encrypted.split(":");
    const tampered = `${iv}:${authTag}:${ciphertext.slice(0, -2)}00`;
    expect(() => decryptSecret(tampered)).toThrow();
  });
});

describe("IServ period-to-override mapping", () => {
  const lessonSlots = [{ id: "slot-1" }, { id: "slot-2" }, { id: "slot-3" }];
  const subjects = [
    { id: "subj-mathe", name: "Mathe" },
    { id: "subj-englisch", name: "Englisch" },
    { id: "subj-deutsch", name: "Deutsch" },
  ];
  const date = new Date("2026-09-22T00:00:00.000Z");

  it("ignores periods with no change (a normal, unmodified lesson)", () => {
    const overrides = mapPeriodsToOverrides(
      "user-1",
      date,
      [period({ period: 1, subject: "M", room: "101", change: null })],
      lessonSlots,
      subjects,
    );
    expect(overrides).toHaveLength(0);
  });

  it("maps a cancelled period (change_types includes '0'), resolving its original subject for name/color/no room", () => {
    const overrides = mapPeriodsToOverrides(
      "user-1",
      date,
      [period({ period: 2, subject: "Mathe", room: "101", change: { changeTypes: ["0"] } })],
      lessonSlots,
      subjects,
    );
    expect(overrides).toEqual([
      {
        userId: "user-1",
        date,
        timeGridSlotId: "slot-2",
        type: "CANCELLED",
        subjectName: "Mathe",
        subjectId: "subj-mathe",
        rawSubjectCode: "Mathe",
        room: null,
        ...BASE_DETAILS,
      },
    ]);
  });

  it("maps a substituted period to the changed subject/room, resolving against the user's own subjects", () => {
    const overrides = mapPeriodsToOverrides(
      "user-1",
      date,
      [
        period({
          period: 3,
          subject: "M",
          room: "101",
          change: { changeTypes: ["1"], substitutionSubject: "Deu", substitutionRoom: "204" },
        }),
      ],
      lessonSlots,
      subjects,
    );
    expect(overrides).toEqual([
      {
        userId: "user-1",
        date,
        timeGridSlotId: "slot-3",
        type: "CHANGED",
        subjectName: "Deutsch",
        subjectId: "subj-deutsch",
        rawSubjectCode: "Deu",
        room: "204",
        ...BASE_DETAILS,
      },
    ]);
  });

  it("resolves a code with a trailing course-level number (e.g. IServ's 'E1') against a same-prefix Subject", () => {
    const overrides = mapPeriodsToOverrides(
      "user-1",
      date,
      [
        period({
          period: 1,
          subject: "M",
          room: "101",
          change: { changeTypes: ["1"], substitutionSubject: "E1" },
        }),
      ],
      lessonSlots,
      subjects,
    );
    expect(overrides[0].subjectName).toBe("Englisch");
  });

  it("resolves via a user-configured iservAlias when the code isn't a name prefix at all (e.g. 'bk3' for 'Kunst')", () => {
    const subjectsWithAliases = [
      ...subjects,
      { id: "subj-kunst", name: "Kunst", iservAlias: "bk3" },
      { id: "subj-gk", name: "Gemeinschaftskunde", iservAlias: "gm" },
    ];
    const overrides = mapPeriodsToOverrides(
      "user-1",
      date,
      [
        period({ period: 1, subject: "M", room: "101", change: { changeTypes: ["1"], substitutionSubject: "bk3" } }),
        period({ period: 2, subject: "M", room: "101", change: { changeTypes: ["1"], substitutionSubject: "gm" } }),
      ],
      lessonSlots,
      subjectsWithAliases,
    );
    expect(overrides[0].subjectName).toBe("Kunst");
    expect(overrides[1].subjectName).toBe("Gemeinschaftskunde");
  });

  it("prefers an exact iservAlias match over an ambiguous prefix match on a different subject", () => {
    // Both "Erdkunde" and "Englisch" start with "e", so the plain prefix
    // heuristic alone can't tell "e2" apart - the alias on "Englisch"
    // should win regardless of which subject the array lists first.
    const subjectsWithAliases = [
      { id: "subj-erdkunde", name: "Erdkunde" },
      { id: "subj-englisch", name: "Englisch", iservAlias: "e2" },
    ];
    const overrides = mapPeriodsToOverrides(
      "user-1",
      date,
      [period({ period: 1, subject: "M", room: "101", change: { changeTypes: ["1"], substitutionSubject: "e2" } })],
      lessonSlots,
      subjectsWithAliases,
    );
    expect(overrides[0].subjectName).toBe("Englisch");
  });

  it("falls back to the raw IServ code when no subject matches", () => {
    const overrides = mapPeriodsToOverrides(
      "user-1",
      date,
      [
        period({
          period: 1,
          subject: "M",
          room: "101",
          change: { changeTypes: ["1"], substitutionSubject: "PXE" },
        }),
      ],
      lessonSlots,
      subjects,
    );
    expect(overrides[0].subjectName).toBe("PXE");
    expect(overrides[0].subjectId).toBeNull();
  });

  it("skips a period beyond the number of configured lesson slots instead of crashing", () => {
    const overrides = mapPeriodsToOverrides(
      "user-1",
      date,
      [period({ period: 9, subject: "M", room: "101", change: { changeTypes: ["0"] } })],
      lessonSlots,
      subjects,
    );
    expect(overrides).toHaveLength(0);
  });

  it("with includeUnchanged, maps an unmodified period to a NORMAL override carrying the lesson's details", () => {
    const overrides = mapPeriodsToOverrides(
      "user-1",
      date,
      [period({ period: 1, subject: "Eng", room: "12", change: null })],
      lessonSlots,
      subjects,
      true,
    );
    expect(overrides).toEqual([
      {
        userId: "user-1",
        date,
        timeGridSlotId: "slot-1",
        type: "NORMAL",
        subjectName: "Englisch",
        subjectId: "subj-englisch",
        rawSubjectCode: "Eng",
        room: "12",
        ...BASE_DETAILS,
      },
    ]);
  });

  it("with includeUnchanged, still maps changed periods as CANCELLED/CHANGED, not NORMAL", () => {
    const overrides = mapPeriodsToOverrides(
      "user-1",
      date,
      [period({ period: 2, subject: "Mathe", room: "101", change: { changeTypes: ["0"] } })],
      lessonSlots,
      subjects,
      true,
    );
    expect(overrides).toEqual([
      {
        userId: "user-1",
        date,
        timeGridSlotId: "slot-2",
        type: "CANCELLED",
        subjectName: "Mathe",
        subjectId: "subj-mathe",
        rawSubjectCode: "Mathe",
        room: null,
        ...BASE_DETAILS,
      },
    ]);
  });

  it("without includeUnchanged (default), still skips unmodified periods", () => {
    const overrides = mapPeriodsToOverrides(
      "user-1",
      date,
      [period({ period: 1, subject: "Eng", room: "12", change: null })],
      lessonSlots,
      subjects,
    );
    expect(overrides).toHaveLength(0);
  });
});

describe("Zeitraster auto-population from IServ", () => {
  function fakePeriod(period: number, startTime: string, endTime: string, label: string | null): IServPeriod {
    return {
      period,
      label,
      subject: "M",
      room: "101",
      startTime,
      endTime,
      teacherName: null,
      teacherAcronym: null,
      courseName: null,
      change: null,
    };
  }

  it("creates LESSON slots for periods with no existing TimeGridSlot yet (fresh account)", async () => {
    const user = await registerUser();
    const byDate = new Map<string, IServPeriod[]>([
      [
        "2026-09-21",
        [
          fakePeriod(1, "08:00", "08:45", "1. Stunde"),
          fakePeriod(2, "08:45", "09:30", "2. Stunde"),
        ],
      ],
    ]);

    const lessonSlots = await syncTimeGridFromIserv(user.userId, byDate);
    expect(lessonSlots).toHaveLength(2);

    const created = await prisma.timeGridSlot.findMany({
      where: { userId: user.userId },
      orderBy: { sortOrder: "asc" },
    });
    expect(created).toEqual([
      expect.objectContaining({ type: "LESSON", label: "1. Stunde", startTime: "08:00", endTime: "08:45" }),
      expect.objectContaining({ type: "LESSON", label: "2. Stunde", startTime: "08:45", endTime: "09:30" }),
    ]);
  });

  it("updates an existing LESSON slot's time/label if it drifted from IServ, without touching manually-inserted Pausen", async () => {
    const user = await registerUser();
    const headers = { Authorization: `Bearer ${user.accessToken}` };

    const lesson1 = await request(app)
      .post("/api/time-grid")
      .set(headers)
      .send({ label: "Alte Bezeichnung", type: "LESSON", startTime: "07:30", endTime: "08:15" });
    const pause = await request(app)
      .post("/api/time-grid")
      .set(headers)
      .send({ label: "Pause", type: "BREAK", startTime: "08:15", endTime: "08:20" });

    const byDate = new Map<string, IServPeriod[]>([
      ["2026-09-21", [fakePeriod(1, "08:00", "08:45", "1. Stunde")]],
    ]);
    const lessonSlots = await syncTimeGridFromIserv(user.userId, byDate);
    expect(lessonSlots).toEqual([{ id: lesson1.body.id }]);

    const updatedLesson = await prisma.timeGridSlot.findUniqueOrThrow({ where: { id: lesson1.body.id } });
    expect(updatedLesson).toMatchObject({ label: "1. Stunde", startTime: "08:00", endTime: "08:45" });

    // The manually-placed Pause is untouched.
    const untouchedPause = await prisma.timeGridSlot.findUniqueOrThrow({ where: { id: pause.body.id } });
    expect(untouchedPause).toMatchObject({ label: "Pause", type: "BREAK", startTime: "08:15", endTime: "08:20" });
  });

  it("appends a new period after existing slots (including Pausen) without disturbing their order", async () => {
    const user = await registerUser();
    const headers = { Authorization: `Bearer ${user.accessToken}` };

    const lesson1 = await request(app)
      .post("/api/time-grid")
      .set(headers)
      .send({ label: "1. Stunde", type: "LESSON", startTime: "08:00", endTime: "08:45" });
    const pause = await request(app)
      .post("/api/time-grid")
      .set(headers)
      .send({ label: "Pause", type: "BREAK", startTime: "08:45", endTime: "09:00" });

    const byDate = new Map<string, IServPeriod[]>([
      [
        "2026-09-21",
        [fakePeriod(1, "08:00", "08:45", "1. Stunde"), fakePeriod(2, "09:00", "09:45", "2. Stunde")],
      ],
    ]);
    await syncTimeGridFromIserv(user.userId, byDate);

    const all = await prisma.timeGridSlot.findMany({
      where: { userId: user.userId },
      orderBy: { sortOrder: "asc" },
    });
    expect(all.map((s) => ({ label: s.label, type: s.type }))).toEqual([
      { label: "1. Stunde", type: "LESSON" },
      { label: "Pause", type: "BREAK" },
      { label: "2. Stunde", type: "LESSON" },
    ]);
    void lesson1;
  });
});

describe("Settings: IServ credentials", () => {
  it("saves host/username/password/class, never returns the password, and reports iservConfigured", async () => {
    const user = await registerUser();
    const headers = { Authorization: `Bearer ${user.accessToken}` };

    const before = await request(app).get("/api/settings").set(headers);
    expect(before.body.iservConfigured).toBe(false);

    const res = await request(app)
      .patch("/api/settings")
      .set(headers)
      .send({
        iservHost: "meine-schule.de",
        iservUsername: "max.mustermann",
        iservPassword: "geheimes-passwort",
        iservClass: "10a",
      });

    expect(res.status).toBe(200);
    expect(res.body.iservConfigured).toBe(true);
    expect(res.body.iservHost).toBe("meine-schule.de");
    expect(res.body).not.toHaveProperty("iservPassword");
    expect(res.body).not.toHaveProperty("iservPasswordEncrypted");
    expect(JSON.stringify(res.body)).not.toContain("geheimes-passwort");
  });

  it("leaves the stored password untouched when omitted from a later update", async () => {
    const user = await registerUser();
    const headers = { Authorization: `Bearer ${user.accessToken}` };

    await request(app)
      .patch("/api/settings")
      .set(headers)
      .send({ iservHost: "meine-schule.de", iservUsername: "u", iservPassword: "erstes-passwort" });

    // Updating just the class shouldn't require (or clear) the password.
    const res = await request(app)
      .patch("/api/settings")
      .set(headers)
      .send({ iservClass: "Q1" });

    expect(res.status).toBe(200);
    expect(res.body.iservConfigured).toBe(true);
    expect(res.body.iservClass).toBe("Q1");
  });

  it("disconnects IServ, clearing all fields and sync status", async () => {
    const user = await registerUser();
    const headers = { Authorization: `Bearer ${user.accessToken}` };

    await request(app)
      .patch("/api/settings")
      .set(headers)
      .send({ iservHost: "meine-schule.de", iservUsername: "u", iservPassword: "pw" });

    const res = await request(app).delete("/api/settings/iserv").set(headers);
    expect(res.status).toBe(200);
    expect(res.body.iservConfigured).toBe(false);
    expect(res.body.iservHost).toBeNull();
    expect(res.body.iservUsername).toBeNull();
  });

  it("rejects triggering a sync when IServ isn't configured", async () => {
    const user = await registerUser();
    const res = await request(app)
      .post("/api/settings/iserv/sync")
      .set({ Authorization: `Bearer ${user.accessToken}` });
    expect(res.status).toBe(400);
  });

  it("rejects an empty password (use the disconnect endpoint to clear instead)", async () => {
    const user = await registerUser();
    const res = await request(app)
      .patch("/api/settings")
      .set({ Authorization: `Bearer ${user.accessToken}` })
      .send({ iservPassword: "" });
    expect(res.status).toBe(400);
  });

  it("defaults iservActive to false, can be toggled on, and resets to false on disconnect", async () => {
    const user = await registerUser();
    const headers = { Authorization: `Bearer ${user.accessToken}` };

    const configured = await request(app)
      .patch("/api/settings")
      .set(headers)
      .send({ iservHost: "meine-schule.de", iservUsername: "u", iservPassword: "pw" });
    expect(configured.body.iservActive).toBe(false);

    const activated = await request(app)
      .patch("/api/settings")
      .set(headers)
      .send({ iservActive: true });
    expect(activated.body.iservActive).toBe(true);

    const disconnected = await request(app).delete("/api/settings/iserv").set(headers);
    expect(disconnected.body.iservActive).toBe(false);
  });
});
