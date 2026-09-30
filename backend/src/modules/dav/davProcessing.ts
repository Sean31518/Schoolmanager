import fsp from "node:fs/promises";
import { analyzePdf, type PdfInfo } from "../../lib/pdfFingerprint.js";
import { prisma } from "../../lib/prisma.js";
import { absoluteDavPath, removeStoredFiles } from "./davStorage.js";

type ProcessedHandler = (fileId: string, info: PdfInfo) => Promise<void>;

// Parsing a PDF holds the whole file in memory (Hefte reach ~200 MB), so
// versions are analyzed strictly one after another, never in parallel -
// the initial backup uploads a whole library within minutes.
const queue: string[] = [];
let draining: Promise<void> | null = null;
const processedHandlers: ProcessedHandler[] = [];

/** Lets the links module relocate page links once a new version's page
 * fingerprints are known, without dav depending on it. */
export function onPdfVersionProcessed(handler: ProcessedHandler) {
  processedHandlers.push(handler);
}

export function enqueueVersion(versionId: string) {
  if (!queue.includes(versionId)) queue.push(versionId);
  if (!draining) {
    draining = drain().finally(() => {
      draining = null;
    });
  }
}

/** Test helper: resolves once the queue is empty. */
export async function waitForProcessingIdle() {
  while (draining) await draining;
}

async function drain() {
  while (queue.length > 0) {
    const versionId = queue.shift()!;
    try {
      await processVersion(versionId);
    } catch (err) {
      console.error("[dav] PDF-Verarbeitung fehlgeschlagen", versionId, err);
    }
  }
}

async function processVersion(versionId: string) {
  const version = await prisma.davFileVersion.findUnique({
    where: { id: versionId },
    include: { file: true },
  });
  if (!version || version.processedAt) return;

  let info: PdfInfo = { pageCount: 0, fingerprints: [] };
  try {
    const bytes = await fsp.readFile(absoluteDavPath(version.storagePath));
    info = await analyzePdf(bytes);
  } catch (err) {
    // A PDF pdf-lib can't read is still kept and downloadable; it just
    // gets no page count, so page links into it can't be relocated.
    console.error("[dav] PDF nicht lesbar", version.file.path, err);
  }

  await prisma.davFileVersion.update({
    where: { id: versionId },
    data: {
      pageCount: info.pageCount,
      pageFingerprints: JSON.stringify(info.fingerprints),
      processedAt: new Date(),
    },
  });

  // Only react if this is still the newest version - a newer upload may
  // have arrived while this one was being parsed and will run afterwards.
  const newest = await prisma.davFileVersion.findFirst({
    where: { fileId: version.fileId },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  if (newest?.id === versionId) {
    for (const handler of processedHandlers) await handler(version.fileId, info);
  }

  await pruneVersions(version.fileId, version.file.userId);
}

export async function pruneVersions(fileId: string, userId: string) {
  const settings = await prisma.settings.findUnique({
    where: { userId },
    select: { davVersionsToKeep: true },
  });
  const keep = Math.max(1, settings?.davVersionsToKeep ?? 3);
  const stale = await prisma.davFileVersion.findMany({
    where: { fileId },
    orderBy: { createdAt: "desc" },
    skip: keep,
    select: { id: true, storagePath: true },
  });
  if (stale.length === 0) return;
  await prisma.davFileVersion.deleteMany({ where: { id: { in: stale.map((v) => v.id) } } });
  await removeStoredFiles(stale.map((v) => v.storagePath));
}

/** After a restart: pick up uploads that were stored but not analyzed yet. */
export async function resumePendingVersions() {
  const pending = await prisma.davFileVersion.findMany({
    where: { processedAt: null, file: { kind: "PDF" } },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  for (const version of pending) enqueueVersion(version.id);
}
