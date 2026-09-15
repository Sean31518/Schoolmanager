import type { z } from "zod";
import { ValidationError } from "../../lib/errors.js";
import { requireOwnedNote, requireOwnedTopic } from "../../lib/ownership.js";
import { prisma } from "../../lib/prisma.js";
import type { createNoteSchema, reorderNotesSchema, updateNoteSchema } from "./notes.schema.js";

function serializeContent(contentJson: unknown) {
  return JSON.stringify(contentJson ?? { type: "doc", content: [] });
}

function mapNote<T extends { contentJson: string }>(note: T) {
  return { ...note, contentJson: JSON.parse(note.contentJson) as unknown };
}

export async function listNotes(userId: string, topicId: string) {
  await requireOwnedTopic(userId, topicId);
  const notes = await prisma.note.findMany({
    where: { topicId },
    orderBy: { sortOrder: "asc" },
  });
  return notes.map(mapNote);
}

export async function getNote(userId: string, noteId: string) {
  const note = await requireOwnedNote(userId, noteId);
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
      contentJson: serializeContent(data.contentJson),
      sortOrder: count,
    },
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
      ...(data.contentJson !== undefined
        ? { contentJson: serializeContent(data.contentJson) }
        : {}),
    },
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

  const notes = await prisma.note.findMany({ where: { topicId }, orderBy: { sortOrder: "asc" } });
  return notes.map(mapNote);
}
