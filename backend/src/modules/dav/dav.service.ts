import type { DavFile, DavFolder } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { ancestorPaths, isInside, parentPath } from "./davPath.js";
import { enqueueVersion } from "./davProcessing.js";
import { commitTempFile, removeStoredFiles, removeTempFile } from "./davStorage.js";

export type DavEntry =
  | { type: "root" }
  | { type: "folder"; folder: DavFolder }
  | { type: "file"; file: DavFile };

export type FileKind = "PDF" | "OTHER" | "PLACEHOLDER";

/** What a PUT to this name will be stored as, before looking at bytes.
 * .goodnotes files are the size of the PDF again and useless to the app,
 * so their bytes are never kept. */
export function kindForName(name: string): FileKind {
  const lower = name.toLowerCase();
  if (lower.endsWith(".pdf")) return "PDF";
  if (lower.endsWith(".goodnotes")) return "PLACEHOLDER";
  return "OTHER";
}

// Non-PDF files bigger than this are kept as placeholders only. The one
// Goodnotes actually needs back is its 26-byte backup-root marker.
export const MAX_STORED_OTHER_BYTES = 1024 * 1024;

export async function getEntry(userId: string, path: string): Promise<DavEntry | null> {
  if (path === "") return { type: "root" };
  const [folder, file] = await Promise.all([
    prisma.davFolder.findUnique({ where: { userId_path: { userId, path } } }),
    prisma.davFile.findUnique({ where: { userId_path: { userId, path } } }),
  ]);
  if (folder) return { type: "folder", folder };
  if (file) return { type: "file", file };
  return null;
}

/** Folders and files below path; direct children only unless recursive. */
export async function listChildren(userId: string, path: string, recursive: boolean) {
  const where = path === "" ? { userId } : { userId, path: { startsWith: path + "/" } };
  const [folders, files] = await Promise.all([
    prisma.davFolder.findMany({ where, orderBy: { path: "asc" } }),
    prisma.davFile.findMany({ where, orderBy: { path: "asc" } }),
  ]);
  const isDirect = (childPath: string) => parentPath(childPath) === path;
  return {
    folders: recursive ? folders : folders.filter((f) => isDirect(f.path)),
    files: recursive ? files : files.filter((f) => isDirect(f.path)),
  };
}

/** Creates any missing ancestor folders of path (not path itself). Goodnotes
 * MKCOLs top-down before uploading, so this is only a safety net for
 * clients that PUT into a folder they never created. */
export async function ensureParentFolders(userId: string, path: string) {
  for (const folderPath of ancestorPaths(path)) {
    await prisma.davFolder.upsert({
      where: { userId_path: { userId, path: folderPath } },
      create: { userId, path: folderPath },
      update: {},
    });
  }
}

export async function createFolder(userId: string, path: string) {
  return prisma.davFolder.create({ data: { userId, path } });
}

export interface StoredUpload {
  tempPath: string | null;
  size: number;
  sha256: string;
}

/**
 * Applies a finished PUT. Returns whether the file existed before. PDFs
 * get a new version (queued for page analysis) unless the bytes are the
 * same as the current version - Goodnotes re-uploads unchanged Hefte now
 * and then. Any upload brings an archived Heft back.
 */
export async function storeUpload(
  userId: string,
  path: string,
  kind: FileKind,
  upload: StoredUpload,
): Promise<{ existed: boolean }> {
  const existing = await prisma.davFile.findUnique({ where: { userId_path: { userId, path } } });
  const now = new Date();

  if (existing && existing.kind === kind && existing.sha256 === upload.sha256 && kind !== "PLACEHOLDER") {
    if (upload.tempPath) await removeTempFile(upload.tempPath);
    await prisma.davFile.update({
      where: { id: existing.id },
      data: { modifiedAt: now, archived: false },
    });
    return { existed: true };
  }

  await ensureParentFolders(userId, path);

  const storagePath =
    upload.tempPath && kind !== "PLACEHOLDER"
      ? await commitTempFile(upload.tempPath, userId, kind === "PDF" ? ".pdf" : ".bin")
      : null;
  if (upload.tempPath && !storagePath) await removeTempFile(upload.tempPath);

  const fileData = {
    kind,
    size: upload.size,
    sha256: kind === "PLACEHOLDER" ? null : upload.sha256,
    archived: false,
    modifiedAt: now,
  };
  const file = existing
    ? await prisma.davFile.update({ where: { id: existing.id }, data: fileData })
    : await prisma.davFile.create({ data: { userId, path, ...fileData } });

  // Only PDFs keep a history; anything else is replaced outright.
  if (kind !== "PDF" || (existing && existing.kind !== "PDF")) {
    const old = await prisma.davFileVersion.findMany({
      where: { fileId: file.id },
      select: { id: true, storagePath: true },
    });
    await prisma.davFileVersion.deleteMany({ where: { id: { in: old.map((v) => v.id) } } });
    await removeStoredFiles(old.map((v) => v.storagePath));
  }

  if (storagePath) {
    const version = await prisma.davFileVersion.create({
      data: {
        fileId: file.id,
        storagePath,
        size: upload.size,
        sha256: upload.sha256,
        // Non-PDFs have nothing to analyze.
        processedAt: kind === "PDF" ? null : now,
      },
    });
    if (kind === "PDF") enqueueVersion(version.id);
  }

  return { existed: Boolean(existing) };
}

export async function currentVersion(fileId: string) {
  return prisma.davFileVersion.findFirst({
    where: { fileId },
    orderBy: { createdAt: "desc" },
  });
}

async function deleteFiles(fileIds: string[]) {
  if (fileIds.length === 0) return;
  const versions = await prisma.davFileVersion.findMany({
    where: { fileId: { in: fileIds } },
    select: { storagePath: true },
  });
  await prisma.davFile.deleteMany({ where: { id: { in: fileIds } } });
  await removeStoredFiles(versions.map((v) => v.storagePath));
}

/** Removes whatever sits at path (file or folder subtree). Only used when a
 * MOVE overwrites its destination. */
async function deleteAt(userId: string, path: string) {
  const entry = await getEntry(userId, path);
  if (!entry || entry.type === "root") return;
  if (entry.type === "file") {
    await deleteFiles([entry.file.id]);
    return;
  }
  const { folders, files } = await listChildren(userId, path, true);
  await deleteFiles(files.map((f) => f.id));
  await prisma.davFolder.deleteMany({
    where: { id: { in: [entry.folder.id, ...folders.map((f) => f.id)] } },
  });
}

export type MoveResult = "created" | "replaced" | "not-found" | "precondition-failed" | "conflict";

/**
 * WebDAV MOVE - how Goodnotes renames and moves Hefte and renames folders.
 * Only paths change; ids stay, so every link to a Heft survives.
 */
export async function move(
  userId: string,
  from: string,
  to: string,
  overwrite: boolean,
): Promise<MoveResult> {
  const source = await getEntry(userId, from);
  if (!source || source.type === "root") return "not-found";
  if (to === "" || to === from || isInside(to, from)) return "conflict";

  const destination = await getEntry(userId, to);
  if (destination && !overwrite) return "precondition-failed";
  if (destination) await deleteAt(userId, to);
  await ensureParentFolders(userId, to);

  if (source.type === "file") {
    await prisma.davFile.update({ where: { id: source.file.id }, data: { path: to } });
  } else {
    const { folders, files } = await listChildren(userId, from, true);
    const rebase = (path: string) => to + path.slice(from.length);
    await prisma.$transaction([
      prisma.davFolder.update({ where: { id: source.folder.id }, data: { path: to } }),
      ...folders.map((f) => prisma.davFolder.update({ where: { id: f.id }, data: { path: rebase(f.path) } })),
      ...files.map((f) => prisma.davFile.update({ where: { id: f.id }, data: { path: rebase(f.path) } })),
    ]);
  }
  return destination ? "replaced" : "created";
}
