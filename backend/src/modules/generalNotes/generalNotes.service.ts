import type { z } from "zod";
import { NotFoundError } from "../../lib/errors.js";
import { prisma } from "../../lib/prisma.js";
import { linksInclude, syncLinks, withMappedLinks } from "../links/links.service.js";
import type {
  createGeneralNoteSchema,
  updateGeneralNoteSchema,
} from "./generalNotes.schema.js";

type StoredGeneralNote = Awaited<ReturnType<typeof findNotes>>[number];

function findNotes(where: { userId: string } | { id: string }) {
  return prisma.generalNote.findMany({ where, orderBy: { sortOrder: "asc" }, include: linksInclude });
}

export function mapGeneralNote(note: StoredGeneralNote) {
  return { ...withMappedLinks(note), contentJson: JSON.parse(note.contentJson) as unknown };
}

async function getGeneralNote(id: string) {
  const [note] = await findNotes({ id });
  return mapGeneralNote(note);
}

export async function listGeneralNotes(userId: string) {
  return (await findNotes({ userId })).map(mapGeneralNote);
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
  if (data.links) await syncLinks(userId, { generalNoteId: note.id }, data.links);
  return getGeneralNote(note.id);
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
  await prisma.generalNote.update({
    where: { id },
    data: {
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.contentJson !== undefined
        ? { contentJson: JSON.stringify(data.contentJson) }
        : {}),
    },
  });
  if (data.links) await syncLinks(userId, { generalNoteId: id }, data.links);
  return getGeneralNote(id);
}

export async function deleteGeneralNote(userId: string, id: string) {
  await requireOwnedGeneralNote(userId, id);
  await prisma.generalNote.delete({ where: { id } });
}
