import request from "supertest";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../lib/prisma.js";
import { ensureAdminExists } from "../modules/auth/auth.service.js";
import { app } from "./helpers.js";

// vitest.config.ts sets fileParallelism: false, so test FILES run strictly
// one at a time - by the time this file starts, no other file's tests are
// still running, so wiping every user here for a genuinely clean slate
// can't clobber anything another file still needs. The shared test.db
// otherwise accumulates thousands of users across the whole suite's
// history, making "the first registered user becomes admin" impossible to
// test meaningfully without this.
beforeAll(async () => {
  await prisma.user.deleteMany();
});

// AppSettings is a global singleton, untouched by wiping User rows - reset
// it before every test so one test toggling registration off can't leak
// into and break an unrelated later test.
beforeEach(async () => {
  await prisma.appSettings.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", registrationEnabled: true },
    update: { registrationEnabled: true },
  });
});

async function register(email: string, password = "supersecret123", displayName = "Test") {
  return request(app).post("/api/auth/register").send({ email, password, displayName });
}

describe("First-user-is-admin", () => {
  it("makes the very first registered account an ADMIN, and every account after that a plain USER", async () => {
    const first = await register("first@example.com");
    expect(first.status).toBe(201);
    expect(first.body.user.role).toBe("ADMIN");

    const second = await register("second@example.com");
    expect(second.status).toBe(201);
    expect(second.body.user.role).toBe("USER");
  });
});

describe("ensureAdminExists (startup bootstrap for pre-existing databases)", () => {
  it("promotes the oldest existing user to ADMIN when none exists yet", async () => {
    await prisma.user.deleteMany();
    await register("older@example.com"); // becomes ADMIN automatically (first user)
    // A real gap in createdAt so "oldest" is unambiguous even at
    // millisecond resolution.
    await new Promise((r) => setTimeout(r, 10));
    await register("newer@example.com");

    // Simulate a database from before roles existed, where every account
    // (including whichever was genuinely first) predates the ADMIN
    // concept entirely - this is what ensureAdminExists() actually exists
    // to recover from on an upgraded deployment.
    await prisma.user.updateMany({ data: { role: "USER" } });
    const beforeAdmins = await prisma.user.count({ where: { role: "ADMIN" } });
    expect(beforeAdmins).toBe(0);

    await ensureAdminExists();

    const olderUser = await prisma.user.findUnique({ where: { email: "older@example.com" } });
    const newerUser = await prisma.user.findUnique({ where: { email: "newer@example.com" } });
    expect(olderUser?.role).toBe("ADMIN");
    expect(newerUser?.role).toBe("USER");
  });

  it("does nothing if an admin already exists", async () => {
    await prisma.user.deleteMany();
    await register("admin-exists@example.com"); // becomes ADMIN (first user)
    await register("someone-else@example.com");

    await ensureAdminExists();

    const admins = await prisma.user.findMany({ where: { role: "ADMIN" } });
    expect(admins).toHaveLength(1);
    expect(admins[0].email).toBe("admin-exists@example.com");
  });
});

describe("Admin: registration toggle", () => {
  it("blocks new registrations when disabled, but never blocks bootstrapping an empty database", async () => {
    await prisma.user.deleteMany();
    const admin = await register("toggle-admin@example.com");
    const adminHeaders = { Authorization: `Bearer ${admin.body.accessToken}` };

    const off = await request(app)
      .patch("/api/admin/settings")
      .set(adminHeaders)
      .send({ registrationEnabled: false });
    expect(off.status).toBe(200);
    expect(off.body.registrationEnabled).toBe(false);

    const blocked = await register("should-be-blocked@example.com");
    expect(blocked.status).toBe(403);

    const on = await request(app)
      .patch("/api/admin/settings")
      .set(adminHeaders)
      .send({ registrationEnabled: true });
    expect(on.body.registrationEnabled).toBe(true);

    const allowed = await register("now-allowed@example.com");
    expect(allowed.status).toBe(201);
  });

  it("reports the current status on the public, unauthenticated endpoint", async () => {
    await prisma.user.deleteMany();
    const admin = await register("status-admin@example.com");
    const adminHeaders = { Authorization: `Bearer ${admin.body.accessToken}` };

    await request(app).patch("/api/admin/settings").set(adminHeaders).send({ registrationEnabled: false });

    const status = await request(app).get("/api/auth/registration-status");
    expect(status.status).toBe(200);
    expect(status.body.enabled).toBe(false);
  });
});

describe("Admin: user management", () => {
  it("rejects a non-admin from every admin route with 403", async () => {
    await prisma.user.deleteMany();
    await register("real-admin@example.com"); // first user, becomes admin
    const plain = await register("plain-user@example.com");
    const plainHeaders = { Authorization: `Bearer ${plain.body.accessToken}` };

    expect((await request(app).get("/api/admin/users").set(plainHeaders)).status).toBe(403);
    expect((await request(app).post("/api/admin/users").set(plainHeaders).send({})).status).toBe(403);
    expect((await request(app).get("/api/admin/settings").set(plainHeaders)).status).toBe(403);
  });

  it("lets an admin list every user, including role and lastSeenAt", async () => {
    await prisma.user.deleteMany();
    const admin = await register("lister-admin@example.com");
    const adminHeaders = { Authorization: `Bearer ${admin.body.accessToken}` };
    await register("lister-plain@example.com");

    // lastSeenAt is bumped by authGuard on any authenticated request - the
    // admin's own login/register already triggered one.
    const res = await request(app).get("/api/admin/users").set(adminHeaders);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    const adminEntry = res.body.find((u: { email: string }) => u.email === "lister-admin@example.com");
    const plainEntry = res.body.find((u: { email: string }) => u.email === "lister-plain@example.com");
    expect(adminEntry).toMatchObject({ role: "ADMIN" });
    expect(adminEntry.lastSeenAt).not.toBeNull();
    expect(plainEntry).toMatchObject({ role: "USER" });
    expect(res.body[0]).not.toHaveProperty("passwordHash");
  });

  it("lets an admin create a new user directly (always role USER), bypassing the registration toggle", async () => {
    await prisma.user.deleteMany();
    const admin = await register("creator-admin@example.com");
    const adminHeaders = { Authorization: `Bearer ${admin.body.accessToken}` };
    await request(app).patch("/api/admin/settings").set(adminHeaders).send({ registrationEnabled: false });

    const res = await request(app)
      .post("/api/admin/users")
      .set(adminHeaders)
      .send({ email: "created-by-admin@example.com", password: "supersecret123", displayName: "Neu" });

    expect(res.status).toBe(201);
    expect(res.body.role).toBe("USER");
    expect(res.body.email).toBe("created-by-admin@example.com");

    // The new account can actually log in.
    const login = await request(app)
      .post("/api/auth/login")
      .send({ email: "created-by-admin@example.com", password: "supersecret123" });
    expect(login.status).toBe(200);
  });

  it("lets an admin delete another user, but rejects deleting themselves this way", async () => {
    await prisma.user.deleteMany();
    const admin = await register("deleter-admin@example.com");
    const adminHeaders = { Authorization: `Bearer ${admin.body.accessToken}` };
    const target = await register("to-be-deleted@example.com");

    const selfDelete = await request(app)
      .delete(`/api/admin/users/${admin.body.user.id}`)
      .set(adminHeaders);
    expect(selfDelete.status).toBe(400);

    const res = await request(app).delete(`/api/admin/users/${target.body.user.id}`).set(adminHeaders);
    expect(res.status).toBe(204);

    const stillThere = await prisma.user.findUnique({ where: { id: target.body.user.id } });
    expect(stillThere).toBeNull();
  });

  it("404s when deleting a user id that doesn't exist", async () => {
    await prisma.user.deleteMany();
    const admin = await register("notfound-admin@example.com");
    const adminHeaders = { Authorization: `Bearer ${admin.body.accessToken}` };

    const res = await request(app).delete("/api/admin/users/does-not-exist").set(adminHeaders);
    expect(res.status).toBe(404);
  });
});

describe("Admin: user editing", () => {
  it("reports each user's storage usage from their uploaded files", async () => {
    await prisma.user.deleteMany();
    const admin = await register("storage-admin@example.com");
    const adminHeaders = { Authorization: `Bearer ${admin.body.accessToken}` };
    const other = await register("storage-user@example.com");

    await prisma.uploadedFile.createMany({
      data: [
        {
          userId: other.body.user.id,
          originalName: "a.pdf",
          mimeType: "application/pdf",
          size: 1000,
          storagePath: "a.pdf",
        },
        {
          userId: other.body.user.id,
          originalName: "b.pdf",
          mimeType: "application/pdf",
          size: 2000,
          storagePath: "b.pdf",
        },
      ],
    });

    const res = await request(app).get("/api/admin/users").set(adminHeaders);
    expect(res.status).toBe(200);
    const adminEntry = res.body.find((u: { email: string }) => u.email === "storage-admin@example.com");
    const otherEntry = res.body.find((u: { email: string }) => u.email === "storage-user@example.com");
    expect(adminEntry.storageBytes).toBe(0);
    expect(otherEntry.storageBytes).toBe(3000);
  });

  it("lets an admin change a user's display name, email, and reset their password", async () => {
    await prisma.user.deleteMany();
    const admin = await register("editor-admin@example.com");
    const adminHeaders = { Authorization: `Bearer ${admin.body.accessToken}` };
    const target = await register("editee@example.com");

    const res = await request(app)
      .patch(`/api/admin/users/${target.body.user.id}`)
      .set(adminHeaders)
      .send({ displayName: "Neuer Name", email: "edited@example.com", password: "brandnewpass123" });
    expect(res.status).toBe(200);
    expect(res.body.displayName).toBe("Neuer Name");
    expect(res.body.email).toBe("edited@example.com");

    // The reset password actually works, without needing the old one.
    const login = await request(app)
      .post("/api/auth/login")
      .send({ email: "edited@example.com", password: "brandnewpass123" });
    expect(login.status).toBe(200);
  });

  it("lets an admin promote a user to ADMIN and demote another admin back to USER", async () => {
    await prisma.user.deleteMany();
    const admin = await register("promoter-admin@example.com");
    const adminHeaders = { Authorization: `Bearer ${admin.body.accessToken}` };
    const target = await register("promotee@example.com");

    const promote = await request(app)
      .patch(`/api/admin/users/${target.body.user.id}`)
      .set(adminHeaders)
      .send({ role: "ADMIN" });
    expect(promote.status).toBe(200);
    expect(promote.body.role).toBe("ADMIN");

    const demote = await request(app)
      .patch(`/api/admin/users/${admin.body.user.id}`)
      .set(adminHeaders)
      .send({ role: "USER" });
    expect(demote.status).toBe(200);
    expect(demote.body.role).toBe("USER");
  });

  it("refuses to demote the very last remaining admin", async () => {
    await prisma.user.deleteMany();
    const admin = await register("lonely-admin@example.com");
    const adminHeaders = { Authorization: `Bearer ${admin.body.accessToken}` };

    const res = await request(app)
      .patch(`/api/admin/users/${admin.body.user.id}`)
      .set(adminHeaders)
      .send({ role: "USER" });
    expect(res.status).toBe(400);

    const stillAdmin = await prisma.user.findUnique({ where: { id: admin.body.user.id } });
    expect(stillAdmin?.role).toBe("ADMIN");
  });

  it("rejects setting an email that's already taken by another account", async () => {
    await prisma.user.deleteMany();
    const admin = await register("conflict-admin@example.com");
    const adminHeaders = { Authorization: `Bearer ${admin.body.accessToken}` };
    const target = await register("conflict-target@example.com");

    const res = await request(app)
      .patch(`/api/admin/users/${target.body.user.id}`)
      .set(adminHeaders)
      .send({ email: "conflict-admin@example.com" });
    expect(res.status).toBe(409);
  });
});

describe("Self-service account deletion", () => {
  it("lets any user delete their own account and everything it owns", async () => {
    await prisma.user.deleteMany();
    const user = await register("self-delete@example.com");
    const headers = { Authorization: `Bearer ${user.body.accessToken}` };

    await request(app)
      .post("/api/subjects")
      .set(headers)
      .send({ name: "Mathe", color: "#3B82F6" });

    const del = await request(app).delete("/api/auth/me").set(headers);
    expect(del.status).toBe(204);

    const gone = await prisma.user.findUnique({ where: { id: user.body.user.id } });
    expect(gone).toBeNull();
    const orphanedSubjects = await prisma.subject.findMany({ where: { userId: user.body.user.id } });
    expect(orphanedSubjects).toHaveLength(0);

    // The old access token is now meaningless - the user row it points to
    // is gone, so authGuard's lastSeenAt update fails and it's rejected
    // like any other invalid token.
    const afterDelete = await request(app).get("/api/auth/me").set(headers);
    expect(afterDelete.status).toBe(401);
  });
});

describe("lastSeenAt tracking", () => {
  it("is null right after registration and gets set by the next authenticated request", async () => {
    await prisma.user.deleteMany();
    const user = await register("lastseen@example.com");
    const headers = { Authorization: `Bearer ${user.body.accessToken}` };

    const fresh = await prisma.user.findUnique({ where: { id: user.body.user.id } });
    expect(fresh?.lastSeenAt).toBeNull();

    await request(app).get("/api/auth/me").set(headers);

    const afterRequest = await prisma.user.findUnique({ where: { id: user.body.user.id } });
    expect(afterRequest?.lastSeenAt).not.toBeNull();
  });
});
