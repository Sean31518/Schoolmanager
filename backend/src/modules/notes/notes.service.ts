import type { z } from "zod";
import { ValidationError } from "../../lib/errors.js";
import { requireOwnedNote, requireOwnedTopic } from "../../lib/ownership.js";
import { prisma } from "../../lib/prisma.js";
import type { createNoteSchema, reorderNotesSchema, updateNoteSchema } from "./notes.schema.js";

const fileSelect = { id: true, originalName: true, mimeType: true, size: true } as const;
const blocksInclude = {
  blocks: { orderBy: { sortOrder: "asc" as const }, include: { file: { select: fileSelect } } },
};

function mapNote<T extends { blocks: { contentJson: string | null }[] }>(note: T) {
  return {
    ...note,
    blocks: note.blocks.map((block) => ({
      ...block,
      contentJson: block.contentJson !== null ? (JSON.parse(block.contentJson) as unknown) : null,
    })),
  };
}

export async function listNotes(userId: string, topicId: string) {
  await requireOwnedTopic(userId, topicId);
  const notes = await prisma.note.findMany({
    where: { topicId },
    orderBy: { sortOrder: "asc" },
    include: blocksInclude,
  });
  return notes.map(mapNote);
}

export async function getNote(userId: string, noteId: string) {
  await requireOwnedNote(userId, noteId);
  const note = await prisma.note.findUniqueOrThrow({ where: { id: noteId }, include: blocksInclude });
  return mapNote(note);
}

export async function createNote(
  userId: string,
  topicId: string,
  data: z.infer<typeof createNoteSchema>,
) {
  await requireOwnedTopic(userId, topicId);
  const count = await prisma.note.count({ where: { topicId } });
  const note = await prisma.note.create({
    data: {
      topicId,
      title: data.title,
      sortOrder: count,
      blocks: {
        create: [{ type: "TEXT", sortOrder: 0, contentJson: JSON.stringify({ type: "doc", content: [] }) }],
      },
    },
    include: blocksInclude,
  });
  return mapNote(note);
}

export async function updateNote(
  userId: string,
  noteId: string,
  data: z.infer<typeof updateNoteSchema>,
) {
  await requireOwnedNote(userId, noteId);
  const note = await prisma.note.update({
    where: { id: noteId },
    data: {
      ...(data.title !== undefined ? { title: data.title } : {}),
    },
    include: blocksInclude,
  });
  return mapNote(note);
}

export async function deleteNote(userId: string, noteId: string) {
  await requireOwnedNote(userId, noteId);
  await prisma.note.delete({ where: { id: noteId } });
}

export async function reorderNotes(
  userId: string,
  topicId: string,
  data: z.infer<typeof reorderNotesSchema>,
) {
  await requireOwnedTopic(userId, topicId);

  const existing = await prisma.note.findMany({ where: { topicId } });
  const existingIds = new Set(existing.map((n) => n.id));
  const providedIds = new Set(data.orderedIds);

  const sameSet =
    existingIds.size === providedIds.size &&
    [...existingIds].every((id) => providedIds.has(id));

  if (!sameSet) {
    throw new ValidationError(
      "orderedIds muss genau die vorhandenen Notizen dieses Themas enthalten",
    );
  }

  await prisma.$transaction(
    data.orderedIds.map((id, index) =>
      prisma.note.update({ where: { id }, data: { sortOrder: index } }),
    ),
  );

  const notes = await prisma.note.findMany({
    where: { topicId },
    orderBy: { sortOrder: "asc" },
    include: blocksInclude,
  });
  return notes.map(mapNote);
}
