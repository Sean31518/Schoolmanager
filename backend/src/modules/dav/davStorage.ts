import { randomBytes } from "node:crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { uploadsDir } from "../../lib/storage.js";

// Stored Goodnotes content lives under <UPLOADS_DIR>/dav/<userId>/, named
// by a random id - never by the Goodnotes path, so renames/moves (WebDAV
// MOVE) never touch the disk and no user-supplied name ends up in a path.
const davRoot = path.join(uploadsDir, "dav");
const tmpDir = path.join(davRoot, "tmp");

export function ensureDavDirs() {
  fs.mkdirSync(tmpDir, { recursive: true });
}

export function absoluteDavPath(storagePath: string) {
  return path.join(davRoot, storagePath);
}

export function newTempPath() {
  return path.join(tmpDir, randomBytes(12).toString("hex") + ".part");
}

/** Moves a finished upload from tmp into the user's folder and returns the
 * storagePath to save on the version row. */
export async function commitTempFile(tempPath: string, userId: string, extension: string) {
  const storagePath = `${userId}/${randomBytes(12).toString("hex")}${extension}`;
  const target = absoluteDavPath(storagePath);
  await fsp.mkdir(path.dirname(target), { recursive: true });
  await fsp.rename(tempPath, target);
  return storagePath;
}

export async function removeStoredFiles(storagePaths: string[]) {
  await Promise.all(
    storagePaths.map((storagePath) => fsp.rm(absoluteDavPath(storagePath), { force: true })),
  );
}

export async function removeTempFile(tempPath: string) {
  await fsp.rm(tempPath, { force: true });
}

export async function removeUserDavDir(userId: string) {
  await fsp.rm(path.join(davRoot, userId), { recursive: true, force: true });
}
