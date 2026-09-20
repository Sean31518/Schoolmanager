import request from "supertest";
import { describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret } from "../lib/credentialsCrypto.js";
import { mapPeriodsToOverrides } from "../modules/iserv/iservSync.service.js";
import { app, registerUser } from "./helpers.js";

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
  const subjects = [{ name: "Mathe" }, { name: "Englisch" }, { name: "Deutsch" }];
  const date = new Date("2026-09-22T00:00:00.000Z");

  it("ignores periods with no change (a normal, unmodified lesson)", () => {
    const overrides = mapPeriodsToOverrides(
      "user-1",
      date,
      [{ period: 1, subject: "M", room: "101", change: null }],
      lessonSlots,
      subjects,
    );
    expect(overrides).toHaveLength(0);
  });

  it("maps a cancelled period (change_types includes '0') without a subject/room", () => {
    const overrides = mapPeriodsToOverrides(
      "user-1",
      date,
      [
        {
          period: 2,
          subject: "M",
          room: "101",
          change: { changeTypes: ["0"] },
        },
      ],
      lessonSlots,
      subjects,
    );
    expect(overrides).toEqual([
      {
        userId: "user-1",
        date,
        timeGridSlotId: "slot-2",
        type: "CANCELLED",
        subjectName: null,
        room: null,
      },
    ]);
  });

  it("maps a substituted period to the changed subject/room, resolving against the user's own subjects", () => {
    const overrides = mapPeriodsToOverrides(
      "user-1",
      date,
      [
        {
          period: 3,
          subject: "M",
          room: "101",
          change: { changeTypes: ["1"], substitutionSubject: "Deu", substitutionRoom: "204" },
        },
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
        room: "204",
      },
    ]);
  });

  it("falls back to the raw IServ code when no subject matches", () => {
    const overrides = mapPeriodsToOverrides(
      "user-1",
      date,
      [{ period: 1, subject: "M", room: "101", change: { changeTypes: ["1"], substitutionSubject: "PXE" } }],
      lessonSlots,
      subjects,
    );
    expect(overrides[0].subjectName).toBe("PXE");
  });

  it("skips a period beyond the number of configured lesson slots instead of crashing", () => {
    const overrides = mapPeriodsToOverrides(
      "user-1",
      date,
      [{ period: 9, subject: "M", room: "101", change: { changeTypes: ["0"] } }],
      lessonSlots,
      subjects,
    );
    expect(overrides).toHaveLength(0);
  });

  it("with includeUnchanged, maps an unmodified period to a NORMAL override instead of skipping it", () => {
    const overrides = mapPeriodsToOverrides(
      "user-1",
      date,
      [{ period: 1, subject: "Eng", room: "12", change: null }],
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
        room: "12",
      },
    ]);
  });

  it("with includeUnchanged, still maps changed periods as CANCELLED/CHANGED, not NORMAL", () => {
    const overrides = mapPeriodsToOverrides(
      "user-1",
      date,
      [{ period: 2, subject: "M", room: "101", change: { changeTypes: ["0"] } }],
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
        subjectName: null,
        room: null,
      },
    ]);
  });

  it("without includeUnchanged (default), still skips unmodified periods", () => {
    const overrides = mapPeriodsToOverrides(
      "user-1",
      date,
      [{ period: 1, subject: "Eng", room: "12", change: null }],
      lessonSlots,
      subjects,
    );
    expect(overrides).toHaveLength(0);
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
