import type { z } from "zod";
import { ValidationError } from "../../lib/errors.js";
import { requireOwnedFile, requireOwnedNote, requireOwnedNoteBlock } from "../../lib/ownership.js";
import { prisma } from "../../lib/prisma.js";
import type {
  createImageBlockSchema,
  createLinkBlockSchema,
  createPdfBlockSchema,
  createTextBlockSchema,
  createVideoBlockSchema,
  reorderBlocksSchema,
  updateBlockSchema,
} from "./noteBlocks.schema.js";

const fileSelect = { id: true, originalName: true, mimeType: true, size: true } as const;

function mapBlock<T extends { contentJson: string | null }>(block: T) {
  return {
    ...block,
    contentJson: block.contentJson !== null ? (JSON.parse(block.contentJson) as unknown) : null,
  };
}

export async function listBlocks(userId: string, noteId: string) {
  await requireOwnedNote(userId, noteId);
  const blocks = await prisma.noteBlock.findMany({
    where: { noteId },
    orderBy: { sortOrder: "asc" },
    include: { file: { select: fileSelect } },
  });
  return blocks.map(mapBlock);
}

async function nextSortOrder(noteId: string) {
  return prisma.noteBlock.count({ where: { noteId } });
}

export async function createTextBlock(
  userId: string,
  noteId: string,
  data: z.infer<typeof createTextBlockSchema>,
) {
  await requireOwnedNote(userId, noteId);
  const sortOrder = await nextSortOrder(noteId);
  const block = await prisma.noteBlock.create({
    data: {
      noteId,
      type: "TEXT",
      sortOrder,
      contentJson: JSON.stringify(data.contentJson ?? { type: "doc", content: [] }),
    },
    include: { file: { select: fileSelect } },
  });
  return mapBlock(block);
}

export async function createLinkBlock(
  userId: string,
  noteId: string,
  data: z.infer<typeof createLinkBlockSchema>,
) {
  await requireOwnedNote(userId, noteId);
  const sortOrder = await nextSortOrder(noteId);
  const block = await prisma.noteBlock.create({
    data: { noteId, type: "LINK", sortOrder, url: data.url },
    include: { file: { select: fileSelect } },
  });
  return mapBlock(block);
}

export async function createVideoBlock(
  userId: string,
  noteId: string,
  data: z.infer<typeof createVideoBlockSchema>,
) {
  await requireOwnedNote(userId, noteId);
  const file = await requireOwnedFile(userId, data.fileId);
  if (!file.mimeType.startsWith("video/")) {
    throw new ValidationError("Datei ist kein Video");
  }
  const sortOrder = await nextSortOrder(noteId);
  const block = await prisma.noteBlock.create({
    data: { noteId, type: "VIDEO", sortOrder, fileId: file.id },
    include: { file: { select: fileSelect } },
  });
  return mapBlock(block);
}

export async function createImageBlock(
  userId: string,
  noteId: string,
  data: z.infer<typeof createImageBlockSchema>,
) {
  await requireOwnedNote(userId, noteId);
  const file = await requireOwnedFile(userId, data.fileId);
  if (!file.mimeType.startsWith("image/")) {
    throw new ValidationError("Datei ist kein Bild");
  }
  const sortOrder = await nextSortOrder(noteId);
  const block = await prisma.noteBlock.create({
    data: { noteId, type: "IMAGE", sortOrder, fileId: file.id },
    include: { file: { select: fileSelect } },
  });
  return mapBlock(block);
}

export async function createPdfBlocks(
  userId: string,
  noteId: string,
  data: z.infer<typeof createPdfBlockSchema>,
) {
  await requireOwnedNote(userId, noteId);
  const file = await requireOwnedFile(userId, data.fileId);
  if (file.mimeType !== "application/pdf") {
    throw new ValidationError("Datei ist kein PDF");
  }
  const startSortOrder = await nextSortOrder(noteId);

  await prisma.$transaction(
    Array.from({ length: data.pageCount }, (_, i) =>
      prisma.noteBlock.create({
        data: {
          noteId,
          type: "PDF_PAGE",
          sortOrder: startSortOrder + i,
          fileId: file.id,
          pageNumber: i + 1,
        },
      }),
    ),
  );

  const blocks = await prisma.noteBlock.findMany({
    where: { noteId, fileId: file.id, type: "PDF_PAGE" },
    orderBy: { pageNumber: "asc" },
    include: { file: { select: fileSelect } },
  });
  return blocks.map(mapBlock);
}

export async function updateBlock(
  userId: string,
  blockId: string,
  data: z.infer<typeof updateBlockSchema>,
) {
  const existing = await requireOwnedNoteBlock(userId, blockId);

  if (data.contentJson !== undefined && existing.type !== "TEXT") {
    throw new ValidationError("Nur Textblöcke haben Inhalt");
  }
  if (data.url !== undefined && existing.type !== "LINK") {
    throw new ValidationError("Nur Link-Blöcke haben eine URL");
  }

  const block = await prisma.noteBlock.update({
    where: { id: blockId },
    data: {
      ...(data.contentJson !== undefined ? { contentJson: JSON.stringify(data.contentJson) } : {}),
      ...(data.url !== undefined ? { url: data.url } : {}),
    },
    include: { file: { select: fileSelect } },
  });
  return mapBlock(block);
}

export async function deleteBlock(userId: string, blockId: string) {
  await requireOwnedNoteBlock(userId, blockId);
  await prisma.noteBlock.delete({ where: { id: blockId } });
}

export async function reorderBlocks(
  userId: string,
  noteId: string,
  data: z.infer<typeof reorderBlocksSchema>,
) {
  await requireOwnedNote(userId, noteId);

  const existing = await prisma.noteBlock.findMany({ where: { noteId } });
  const existingIds = new Set(existing.map((b) => b.id));
  const providedIds = new Set(data.orderedIds);

  const sameSet =
    existingIds.size === providedIds.size &&
    [...existingIds].every((id) => providedIds.has(id));

  if (!sameSet) {
    throw new ValidationError("orderedIds muss genau die vorhandenen Blöcke dieser Notiz enthalten");
  }

  await prisma.$transaction(
    data.orderedIds.map((id, index) =>
      prisma.noteBlock.update({ where: { id }, data: { sortOrder: index } }),
    ),
  );

  return listBlocks(userId, noteId);
}
