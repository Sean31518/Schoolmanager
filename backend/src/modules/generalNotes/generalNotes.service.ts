import type { z } from "zod";
import { NotFoundError } from "../../lib/errors.js";
import { prisma } from "../../lib/prisma.js";
import type {
  createGeneralNoteSchema,
  updateGeneralNoteSchema,
} from "./generalNotes.schema.js";

export async function listGeneralNotes(userId: string) {
  const notes = await prisma.generalNote.findMany({
    where: { userId },
    orderBy: { sortOrder: "asc" },
  });
  return notes.map((note) => ({
    ...note,
    contentJson: JSON.parse(note.contentJson) as unknown,
  }));
}

export async function createGeneralNote(
  userId: string,
  data: z.infer<typeof createGeneralNoteSchema>,
) {
  const count = await prisma.generalNote.count({ where: { userId } });
  const note = await prisma.generalNote.create({
    data: {
      userId,
      title: data.title ?? null,
      contentJson: JSON.stringify(data.contentJson),
      sortOrder: count,
    },
  });
  return { ...note, contentJson: data.contentJson as unknown };
}

async function requireOwnedGeneralNote(userId: string, id: string) {
  const note = await prisma.generalNote.findFirst({ where: { id, userId } });
  if (!note) {
    throw new NotFoundError("Notiz nicht gefunden");
  }
  return note;
}

export async function updateGeneralNote(
  userId: string,
  id: string,
  data: z.infer<typeof updateGeneralNoteSchema>,
) {
  await requireOwnedGeneralNote(userId, id);
  const note = await prisma.generalNote.update({
    where: { id },
    data: {
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.contentJson !== undefined
        ? { contentJson: JSON.stringify(data.contentJson) }
        : {}),
    },
  });
  return { ...note, contentJson: JSON.parse(note.contentJson) as unknown };
}

export async function deleteGeneralNote(userId: string, id: string) {
  await requireOwnedGeneralNote(userId, id);
  await prisma.generalNote.delete({ where: { id } });
}
