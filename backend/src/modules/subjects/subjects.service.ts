import type { z } from "zod";
import { ConflictError, NotFoundError } from "../../lib/errors.js";
import { prisma } from "../../lib/prisma.js";
import type { createSubjectSchema, updateSubjectSchema } from "./subjects.schema.js";

export async function listSubjects(userId: string) {
  return prisma.subject.findMany({
    where: { userId },
    orderBy: { name: "asc" },
    include: { noteSectionTypes: { orderBy: { sortOrder: "asc" } } },
  });
}

export async function createSubject(
  userId: string,
  data: z.infer<typeof createSubjectSchema>,
) {
  const existing = await prisma.subject.findUnique({
    where: { userId_name: { userId, name: data.name } },
  });
  if (existing) {
    throw new ConflictError("Ein Fach mit diesem Namen existiert bereits");
  }

  return prisma.subject.create({ data: { ...data, userId } });
}

export async function getSubject(userId: string, subjectId: string) {
  const subject = await prisma.subject.findFirst({
    where: { id: subjectId, userId },
    include: { noteSectionTypes: { orderBy: { sortOrder: "asc" } } },
  });
  if (!subject) {
    throw new NotFoundError("Fach nicht gefunden");
  }
  return subject;
}

export async function updateSubject(
  userId: string,
  subjectId: string,
  data: z.infer<typeof updateSubjectSchema>,
) {
  const subject = await prisma.subject.findFirst({ where: { id: subjectId, userId } });
  if (!subject) {
    throw new NotFoundError("Fach nicht gefunden");
  }

  if (data.name && data.name !== subject.name) {
    const existing = await prisma.subject.findUnique({
      where: { userId_name: { userId, name: data.name } },
    });
    if (existing) {
      throw new ConflictError("Ein Fach mit diesem Namen existiert bereits");
    }
  }

  return prisma.subject.update({ where: { id: subjectId }, data });
}

export async function listNotesForSubject(userId: string, subjectId: string) {
  const subject = await prisma.subject.findFirst({ where: { id: subjectId, userId } });
  if (!subject) {
    throw new NotFoundError("Fach nicht gefunden");
  }

  const sectionTypes = await prisma.noteSectionType.findMany({
    where: { subjectId },
    include: {
      topics: {
        include: {
          notes: { orderBy: { updatedAt: "desc" } },
        },
      },
    },
  });

  const notes = sectionTypes.flatMap((sectionType) =>
    sectionType.topics.flatMap((topic) =>
      topic.notes.map((note) => ({
        id: note.id,
        title: note.title,
        updatedAt: note.updatedAt,
        topicId: topic.id,
        topicName: topic.name,
        sectionTypeId: sectionType.id,
        sectionTypeName: sectionType.name,
      })),
    ),
  );

  notes.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  return notes;
}

export async function deleteSubject(userId: string, subjectId: string) {
  const subject = await prisma.subject.findFirst({ where: { id: subjectId, userId } });
  if (!subject) {
    throw new NotFoundError("Fach nicht gefunden");
  }
  await prisma.subject.delete({ where: { id: subjectId } });
}
