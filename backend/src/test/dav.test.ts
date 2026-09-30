import request from "supertest";
import { describe, expect, it } from "vitest";
import { prisma } from "../lib/prisma.js";
import { createDavHandler } from "../modules/dav/dav.server.js";
import { waitForProcessingIdle } from "../modules/dav/davProcessing.js";
import { app, makePdf, registerDavUser, registerUser } from "./helpers.js";

const dav = createDavHandler();

function put(auth: string, path: string, body: Buffer) {
  return request(dav)
    .put(path)
    .set("Authorization", auth)
    .set("Content-Type", "application/octet-stream")
    .send(body);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- superagent's parser callback type
function binary(res: any, cb: (err: Error | null, body: Buffer) => void) {
  const chunks: Buffer[] = [];
  res.on("data", (c: Buffer) => chunks.push(c));
  res.on("end", () => cb(null, Buffer.concat(chunks)));
}

describe("App passwords", () => {
  it("shows the password once, lists it without it, and can be revoked", async () => {
    const user = await registerUser();
    const headers = { Authorization: `Bearer ${user.accessToken}` };

    const created = await request(app).post("/api/app-passwords").set(headers).send({ label: "iPad" });
    expect(created.status).toBe(201);
    expect(created.body.password).toMatch(/^[a-z2-9]{4}(-[a-z2-9]{4}){4}$/);

    const list = await request(app).get("/api/app-passwords").set(headers);
    expect(list.body.passwords).toEqual([
      expect.objectContaining({ id: created.body.id, label: "iPad" }),
    ]);
    expect(JSON.stringify(list.body)).not.toContain(created.body.password);

    const auth = "Basic " + Buffer.from(`${user.email}:${created.body.password}`).toString("base64");
    expect((await request(dav).propfind("/").set("Authorization", auth)).status).toBe(207);

    await request(app).delete(`/api/app-passwords/${created.body.id}`).set(headers);
    expect((await request(dav).propfind("/").set("Authorization", auth)).status).toBe(401);
  });
});

describe("WebDAV (Goodnotes Auto-Backup)", () => {
  it("challenges unauthenticated requests and rejects the login password or another user's email", async () => {
    const user = await registerDavUser();
    const other = await registerUser();

    const anonymous = await request(dav).propfind("/");
    expect(anonymous.status).toBe(401);
    expect(anonymous.headers["www-authenticate"]).toMatch(/^Basic /);

    const loginPassword = "Basic " + Buffer.from(`${user.email}:${user.password}`).toString("base64");
    expect((await request(dav).propfind("/").set("Authorization", loginPassword)).status).toBe(401);

    const wrongEmail = "Basic " + Buffer.from(`${other.email}:${user.appPassword}`).toString("base64");
    expect((await request(dav).propfind("/").set("Authorization", wrongEmail)).status).toBe(401);
  });

  it("mirrors folders and stores PDFs, analyzing their pages", async () => {
    const user = await registerDavUser();
    const auth = user.davAuth;

    const missing = await request(dav).propfind("/GoodNotes").set("Authorization", auth).set("Depth", "0");
    expect(missing.status).toBe(404);
    expect((await request(dav).mkcol("/GoodNotes").set("Authorization", auth)).status).toBe(201);
    expect((await request(dav).mkcol("/GoodNotes/Schule/Q1").set("Authorization", auth)).status).toBe(409);
    expect((await request(dav).mkcol("/GoodNotes/Schule").set("Authorization", auth)).status).toBe(201);
    expect((await request(dav).mkcol("/GoodNotes/Schule").set("Authorization", auth)).status).toBe(405);

    const pdf = await makePdf(["A", "B", "C"]);
    expect((await put(auth, "/GoodNotes/Schule/Mathe%20%C3%9Cbung.pdf", pdf)).status).toBe(201);
    await waitForProcessingIdle();

    const listing = await request(dav)
      .propfind("/GoodNotes/Schule/")
      .set("Authorization", auth)
      .set("Depth", "1");
    expect(listing.status).toBe(207);
    expect(listing.text).toContain("<d:href>/GoodNotes/Schule/Mathe%20%C3%9Cbung.pdf</d:href>");
    expect(listing.text).toContain(`<d:getcontentlength>${pdf.length}</d:getcontentlength>`);

    const file = await prisma.davFile.findFirstOrThrow({
      where: { userId: user.userId },
      include: { versions: true },
    });
    expect(file).toMatchObject({ path: "GoodNotes/Schule/Mathe Übung.pdf", kind: "PDF" });
    expect(file.versions).toHaveLength(1);
    expect(file.versions[0].pageCount).toBe(3);
    const fingerprints = JSON.parse(file.versions[0].pageFingerprints) as string[];
    expect(new Set(fingerprints).size).toBe(3);

    const download = await request(dav)
      .get("/GoodNotes/Schule/Mathe%20%C3%9Cbung.pdf")
      .set("Authorization", auth)
      .buffer(true)
      .parse(binary);
    expect(download.status).toBe(200);
    expect(Buffer.compare(download.body as Buffer, pdf)).toBe(0);
  });

  it("gives an unchanged page the same fingerprint after pages were inserted before it", async () => {
    const user = await registerDavUser();
    await put(user.davAuth, "/Heft.pdf", await makePdf(["A", "B", "C"]));
    await put(user.davAuth, "/Heft.pdf", await makePdf(["A", "NEU", "B", "C"]));
    await waitForProcessingIdle();

    const [newer, older] = await prisma.davFileVersion.findMany({
      where: { file: { userId: user.userId } },
      orderBy: { createdAt: "desc" },
    });
    const before = JSON.parse(older.pageFingerprints) as string[];
    const after = JSON.parse(newer.pageFingerprints) as string[];
    expect(after[0]).toBe(before[0]);
    expect(after[2]).toBe(before[1]);
    expect(after[3]).toBe(before[2]);
    expect(before).not.toContain(after[1]);
  });

  it("keeps the configured number of PDF versions and ignores identical re-uploads", async () => {
    const user = await registerDavUser();
    const auth = user.davAuth;

    const v1 = await makePdf(["A"]);
    expect((await put(auth, "/Heft.pdf", v1)).status).toBe(201);
    expect((await put(auth, "/Heft.pdf", v1)).status).toBe(204);
    for (const labels of [["A", "B"], ["A", "B", "C"], ["A", "B", "C", "D"]]) {
      expect((await put(auth, "/Heft.pdf", await makePdf(labels))).status).toBe(204);
    }
    await waitForProcessingIdle();

    const versions = await prisma.davFileVersion.findMany({
      where: { file: { userId: user.userId } },
      orderBy: { createdAt: "desc" },
    });
    expect(versions.map((v) => v.pageCount)).toEqual([4, 3, 2]);
  });

  it("keeps the backup-root marker but only a placeholder of .goodnotes files", async () => {
    const user = await registerDavUser();
    const auth = user.davAuth;
    await request(dav).mkcol("/GoodNotes").set("Authorization", auth);

    const marker = Buffer.from("goodnotes-backup-root-0001");
    const before = await request(dav).get("/GoodNotes/.GoodnotesBackupRoot").set("Authorization", auth);
    expect(before.status).toBe(404);
    expect((await put(auth, "/GoodNotes/.GoodnotesBackupRoot", marker)).status).toBe(201);
    const back = await request(dav)
      .get("/GoodNotes/.GoodnotesBackupRoot")
      .set("Authorization", auth)
      .buffer(true)
      .parse(binary);
    expect(back.status).toBe(200);
    expect((back.body as Buffer).toString()).toBe(marker.toString());

    const notebook = Buffer.alloc(50_000, 7);
    expect((await put(auth, "/GoodNotes/Mathe.goodnotes", notebook)).status).toBe(201);
    const propfind = await request(dav)
      .propfind("/GoodNotes/Mathe.goodnotes")
      .set("Authorization", auth)
      .set("Depth", "0");
    expect(propfind.status).toBe(207);
    expect(propfind.text).toContain("<d:getcontentlength>50000</d:getcontentlength>");
    const placeholder = await prisma.davFile.findFirstOrThrow({
      where: { userId: user.userId, path: "GoodNotes/Mathe.goodnotes" },
      include: { versions: true },
    });
    expect(placeholder.kind).toBe("PLACEHOLDER");
    expect(placeholder.versions).toHaveLength(0);
  });

  it("follows renames and folder moves without changing the Heft's identity", async () => {
    const user = await registerDavUser();
    const auth = user.davAuth;
    await request(dav).mkcol("/GoodNotes").set("Authorization", auth);
    await request(dav).mkcol("/GoodNotes/Q1").set("Authorization", auth);
    await put(auth, "/GoodNotes/Q1/Zentrale.pdf", await makePdf(["A"]));
    const original = await prisma.davFile.findFirstOrThrow({ where: { userId: user.userId } });

    const rename = await request(dav)
      .move("/GoodNotes/Q1/Zentrale.pdf")
      .set("Authorization", auth)
      .set("Destination", "https://schooldav.example/GoodNotes/Q1/TestText.pdf");
    expect(rename.status).toBe(201);

    const folderRename = await request(dav)
      .move("/GoodNotes/Q1/")
      .set("Authorization", auth)
      .set("Destination", "https://schooldav.example/GoodNotes/Q2/");
    expect(folderRename.status).toBe(201);

    const moved = await prisma.davFile.findUniqueOrThrow({ where: { id: original.id } });
    expect(moved.path).toBe("GoodNotes/Q2/TestText.pdf");
    const folders = await prisma.davFolder.findMany({
      where: { userId: user.userId },
      orderBy: { path: "asc" },
    });
    expect(folders.map((f) => f.path)).toEqual(["GoodNotes", "GoodNotes/Q2"]);

    await put(auth, "/GoodNotes/Other.pdf", await makePdf(["X"]));
    const refused = await request(dav)
      .move("/GoodNotes/Other.pdf")
      .set("Authorization", auth)
      .set("Destination", "/GoodNotes/Q2/TestText.pdf")
      .set("Overwrite", "F");
    expect(refused.status).toBe(412);
  });

  it("never lets one user see or touch another user's files, and refuses DELETE", async () => {
    const owner = await registerDavUser();
    const intruder = await registerDavUser();
    await put(owner.davAuth, "/Geheim.pdf", await makePdf(["A"]));

    expect((await request(dav).get("/Geheim.pdf").set("Authorization", intruder.davAuth)).status).toBe(404);
    const rootListing = await request(dav)
      .propfind("/")
      .set("Authorization", intruder.davAuth)
      .set("Depth", "1");
    expect(rootListing.text).not.toContain("Geheim");
    expect((await request(dav).delete("/Geheim.pdf").set("Authorization", owner.davAuth)).status).toBe(403);
  });
});
