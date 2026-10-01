import { z } from "zod";
import { NotFoundError, ValidationError } from "../../lib/errors.js";
import { matchPages, relocatePage } from "../../lib/pageRelocation.js";
import { prisma } from "../../lib/prisma.js";
import { baseName } from "../dav/davPath.js";

/*
 * DocumentLinks point from a Hausaufgabe, Termin/Klausur, Karteikarte or
 * Dashboard-Notiz to a whole Heft (pageStart null) or a page range in it.
 * Owners send their complete list of links on create/update; this module
 * diffs it against what's stored so untouched links keep their
 * fingerprints and "unsicher" state.
 */

export const linkInputSchema = z.object({
  /** An existing link of this owner to keep (unchanged if the pages match). */
  id: z.string().optional(),
  fileId: z.string(),
  pageStart: z.number().int().min(1).nullable().optional(),
  pageEnd: z.number().int().min(1).nullable().optional(),
});
export const linksInputSchema = z.array(linkInputSchema).max(50);
export type LinkInput = z.infer<typeof linkInputSchema>;

export type LinkOwner =
  | { homeworkId: string }
  | { calendarEventId: string }
  | { flashcardId: string }
  | { generalNoteId: string };

export const linksInclude = {
  links: {
    orderBy: { sortOrder: "asc" as const },
    include: { file: { select: { id: true, path: true, archived: true } } },
  },
};

interface StoredLink {
  id: string;
  fileId: string;
  pageStart: number | null;
  pageEnd: number | null;
  uncertain: boolean;
  file: { id: string; path: string; archived: boolean };
}

export function heftName(path: string) {
  return baseName(path).replace(/\.pdf$/i, "");
}

export function mapLink(link: StoredLink) {
  return {
    id: link.id,
    fileId: link.fileId,
    heftName: heftName(link.file.path),
    heftPath: link.file.path,
    archived: link.file.archived,
    pageStart: link.pageStart,
    pageEnd: link.pageEnd,
    uncertain: link.uncertain,
  };
}

/** Replaces the prisma `links` relation with the API shape. */
export function withMappedLinks<T extends { links: StoredLink[] }>(record: T) {
  return { ...record, links: record.links.map(mapLink) };
}

/** The version the app shows and links refer to: the newest one whose
 * pages are already analyzed (a just-uploaded one may still be queued). */
export async function displayedVersion(fileId: string) {
  return (
    (await prisma.davFileVersion.findFirst({
      where: { fileId, processedAt: { not: null } },
      orderBy: { createdAt: "desc" },
    })) ??
    (await prisma.davFileVersion.findFirst({ where: { fileId }, orderBy: { createdAt: "desc" } }))
  );
}

async function fingerprintsOf(fileId: string): Promise<string[]> {
  const version = await displayedVersion(fileId);
  if (!version?.processedAt) return [];
  return JSON.parse(version.pageFingerprints) as string[];
}

function normalizedRange(input: LinkInput) {
  const pageStart = input.pageStart ?? null;
  if (pageStart === null) return { pageStart: null, pageEnd: null };
  const pageEnd = input.pageEnd ?? pageStart;
  return pageEnd < pageStart ? { pageStart: pageEnd, pageEnd: pageStart } : { pageStart, pageEnd };
}

export async function syncLinks(userId: string, owner: LinkOwner, inputs: LinkInput[]) {
  const fileIds = [...new Set(inputs.map((i) => i.fileId))];
  const files = await prisma.davFile.findMany({
    where: { id: { in: fileIds }, userId, kind: "PDF" },
    select: { id: true },
  });
  if (files.length !== fileIds.length) {
    throw new NotFoundError("Heft nicht gefunden");
  }

  const existing = await prisma.documentLink.findMany({ where: owner });
  const existingById = new Map(existing.map((l) => [l.id, l]));
  const kept = new Set<string>();
  const fingerprintCache = new Map<string, string[]>();

  for (const [sortOrder, input] of inputs.entries()) {
    const range = normalizedRange(input);
    const current = input.id ? existingById.get(input.id) : undefined;
    if (
      current &&
      current.fileId === input.fileId &&
      current.pageStart === range.pageStart &&
      current.pageEnd === range.pageEnd
    ) {
      kept.add(current.id);
      if (current.sortOrder !== sortOrder) {
        await prisma.documentLink.update({ where: { id: current.id }, data: { sortOrder } });
      }
      continue;
    }

    if (!fingerprintCache.has(input.fileId)) {
      fingerprintCache.set(input.fileId, await fingerprintsOf(input.fileId));
    }
    const fps = fingerprintCache.get(input.fileId)!;
    if (range.pageEnd !== null && fps.length > 0 && range.pageEnd > fps.length) {
      throw new ValidationError(`Das Heft hat nur ${fps.length} Seiten`);
    }
    await prisma.documentLink.create({
      data: {
        userId,
        ...owner,
        fileId: input.fileId,
        ...range,
        fingerprintStart: range.pageStart !== null ? (fps[range.pageStart - 1] ?? null) : null,
        fingerprintEnd: range.pageEnd !== null ? (fps[range.pageEnd - 1] ?? null) : null,
        sortOrder,
      },
    });
  }

  const removed = existing.filter((l) => !kept.has(l.id)).map((l) => l.id);
  if (removed.length > 0) {
    await prisma.documentLink.deleteMany({ where: { id: { in: removed } } });
  }
}

/** "Stimmt so" on an unsicher link: clears the flag and remembers the
 * pages as they look now. */
export async function confirmLink(userId: string, id: string) {
  const link = await prisma.documentLink.findFirst({ where: { id, userId } });
  if (!link) {
    throw new NotFoundError("Verknüpfung nicht gefunden");
  }
  const fps = await fingerprintsOf(link.fileId);
  const updated = await prisma.documentLink.update({
    where: { id },
    data: {
      uncertain: false,
      fingerprintStart: link.pageStart !== null ? (fps[link.pageStart - 1] ?? null) : null,
      fingerprintEnd: link.pageEnd !== null ? (fps[link.pageEnd - 1] ?? null) : null,
    },
    include: { file: { select: { id: true, path: true, archived: true } } },
  });
  return mapLink(updated);
}

function uniqueIndex(fps: string[], fingerprint: string | null) {
  if (!fingerprint) return -1;
  const first = fps.indexOf(fingerprint);
  return first !== -1 && fps.indexOf(fingerprint, first + 1) === -1 ? first : -1;
}

/**
 * Moves page links along when a new version of a Heft was analyzed.
 * oldFps are the pages of the version the links referred to so far (the
 * previously displayed one); without them, a link can only be re-found by
 * its own stored page fingerprint.
 */
export async function relocateLinksForFile(fileId: string, oldFps: string[] | null, newFps: string[]) {
  if (newFps.length === 0) return;
  const links = await prisma.documentLink.findMany({
    where: { fileId, pageStart: { not: null } },
  });
  if (links.length === 0) return;
  const matches = oldFps && oldFps.length > 0 ? matchPages(oldFps, newFps) : null;

  const locate = (page: number, fingerprint: string | null) => {
    const byFingerprint = uniqueIndex(newFps, fingerprint);
    if (matches) {
      const relocated = relocatePage(page - 1, matches, oldFps!.length, newFps.length);
      // Its own fingerprint landing exactly there confirms the guess.
      if (relocated.uncertain && byFingerprint === relocated.index) return { index: byFingerprint, uncertain: false };
      return relocated;
    }
    if (byFingerprint !== -1) return { index: byFingerprint, uncertain: false };
    return { index: Math.min(page - 1, newFps.length - 1), uncertain: true };
  };

  for (const link of links) {
    const start = locate(link.pageStart!, link.fingerprintStart);
    const end = locate(link.pageEnd ?? link.pageStart!, link.fingerprintEnd);
    let endIndex = end.index;
    let uncertain = link.uncertain || start.uncertain || end.uncertain;
    if (endIndex < start.index) {
      endIndex = start.index;
      uncertain = true;
    }
    await prisma.documentLink.update({
      where: { id: link.id },
      data: {
        pageStart: start.index + 1,
        pageEnd: endIndex + 1,
        fingerprintStart: newFps[start.index],
        fingerprintEnd: newFps[endIndex],
        uncertain,
      },
    });
  }
}
