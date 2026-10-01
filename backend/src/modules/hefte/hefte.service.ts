import { NotFoundError } from "../../lib/errors.js";
import { requireOwnedSubject } from "../../lib/ownership.js";
import { prisma } from "../../lib/prisma.js";
import { parentPath } from "../dav/davPath.js";
import { absoluteDavPath } from "../dav/davStorage.js";
import { displayedVersion, heftName } from "../links/links.service.js";
import { resolveSubject } from "./subjectMatching.js";

export type ArchivedFilter = "active" | "archived" | "all";

const versionSelect = {
  orderBy: { createdAt: "desc" as const },
  select: { id: true, pageCount: true, processedAt: true, createdAt: true },
};

async function subjectContext(userId: string) {
  const [subjects, folders] = await Promise.all([
    prisma.subject.findMany({ where: { userId }, select: { id: true, name: true, color: true } }),
    prisma.davFolder.findMany({
      where: { userId, subjectId: { not: null } },
      select: { path: true, subjectId: true },
    }),
  ]);
  const manualFolders = new Map(folders.map((f) => [f.path, f.subjectId!]));
  return { subjects, manualFolders, subjectsById: new Map(subjects.map((s) => [s.id, s])) };
}

type FileWithVersions = Awaited<ReturnType<typeof loadFiles>>[number];

function loadFiles(userId: string, where: object = {}) {
  return prisma.davFile.findMany({
    where: { userId, kind: "PDF", ...where },
    orderBy: { path: "asc" },
    include: { versions: versionSelect, _count: { select: { links: true } } },
  });
}

function mapHeft(file: FileWithVersions, context: Awaited<ReturnType<typeof subjectContext>>) {
  const resolved = resolveSubject(file.path, context.subjects, context.manualFolders);
  const shown = file.versions.find((v) => v.processedAt) ?? file.versions[0];
  return {
    id: file.id,
    name: heftName(file.path),
    path: file.path,
    folderPath: parentPath(file.path),
    subject: resolved.subjectId ? (context.subjectsById.get(resolved.subjectId) ?? null) : null,
    subjectSource: resolved.source,
    subjectFolderPath: resolved.folderPath,
    archived: file.archived,
    pageCount: shown?.pageCount ?? 0,
    // A newer upload than the one shown is still being analyzed.
    processing: Boolean(file.versions[0] && !file.versions[0].processedAt),
    size: file.size,
    modifiedAt: file.modifiedAt,
    linkCount: file._count.links,
  };
}

export async function listHefte(
  userId: string,
  filters: { archived: ArchivedFilter; subjectId?: string },
) {
  const where = filters.archived === "all" ? {} : { archived: filters.archived === "archived" };
  const [files, context] = await Promise.all([loadFiles(userId, where), subjectContext(userId)]);
  const hefte = files.map((file) => mapHeft(file, context));
  if (filters.subjectId === "none") return hefte.filter((h) => !h.subject);
  if (filters.subjectId) return hefte.filter((h) => h.subject?.id === filters.subjectId);
  return hefte;
}

async function requireOwnedHeft(userId: string, id: string) {
  const file = await prisma.davFile.findFirst({ where: { id, userId, kind: "PDF" } });
  if (!file) {
    throw new NotFoundError("Heft nicht gefunden");
  }
  return file;
}

export async function getHeft(userId: string, id: string) {
  await requireOwnedHeft(userId, id);
  const [[file], context] = await Promise.all([loadFiles(userId, { id }), subjectContext(userId)]);
  return mapHeft(file, context);
}

export async function setArchived(userId: string, id: string, archived: boolean) {
  await requireOwnedHeft(userId, id);
  await prisma.davFile.update({ where: { id }, data: { archived } });
  return getHeft(userId, id);
}

/** Absolute path of the PDF the viewer shows (see displayedVersion). */
export async function heftPdfPath(userId: string, id: string) {
  await requireOwnedHeft(userId, id);
  const version = await displayedVersion(id);
  if (!version) {
    throw new NotFoundError("Heft hat noch keinen Inhalt");
  }
  return { absolutePath: absoluteDavPath(version.storagePath), etag: version.sha256 };
}

/** Manual Fach for a Goodnotes folder (from "Ohne Fach"); covers every Heft
 * below it that isn't matched automatically. null removes it. */
export async function assignFolderSubject(userId: string, folderPath: string, subjectId: string | null) {
  if (subjectId) await requireOwnedSubject(userId, subjectId);
  const folder = await prisma.davFolder.findUnique({
    where: { userId_path: { userId, path: folderPath } },
  });
  if (!folder) {
    throw new NotFoundError("Ordner nicht gefunden");
  }
  await prisma.davFolder.update({ where: { id: folder.id }, data: { subjectId } });
}
