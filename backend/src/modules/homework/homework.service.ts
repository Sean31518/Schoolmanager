import type { z } from "zod";
import { NotFoundError } from "../../lib/errors.js";
import { prisma } from "../../lib/prisma.js";
import type { createHomeworkSchema, updateHomeworkSchema } from "./homework.schema.js";

interface ListFilters {
  done?: boolean;
  subjectId?: string;
}

export async function listHomework(userId: string, filters: ListFilters) {
  return prisma.homework.findMany({
    where: {
      userId,
      ...(filters.done !== undefined ? { done: filters.done } : {}),
      ...(filters.subjectId ? { subjectId: filters.subjectId } : {}),
    },
    include: { subject: true },
    orderBy: [{ done: "asc" }, { dueDate: "asc" }],
  });
}

async function requireOwnedSubjectIfProvided(
  userId: string,
  subjectId: string | null | undefined,
) {
  if (!subjectId) return;
  const subject = await prisma.subject.findFirst({ where: { id: subjectId, userId } });
  if (!subject) {
    throw new NotFoundError("Fach nicht gefunden");
  }
}

export async function createHomework(
  userId: string,
  data: z.infer<typeof createHomeworkSchema>,
) {
  await requireOwnedSubjectIfProvided(userId, data.subjectId);
  return prisma.homework.create({
    data: {
      userId,
      title: data.title,
      subjectId: data.subjectId ?? null,
      dueDate: data.dueDate ?? null,
      note: data.note ?? null,
    },
    include: { subject: true },
  });
}

async function requireOwnedHomework(userId: string, id: string) {
  const homework = await prisma.homework.findFirst({ where: { id, userId } });
  if (!homework) {
    throw new NotFoundError("Hausaufgabe nicht gefunden");
  }
  return homework;
}

export async function updateHomework(
  userId: string,
  id: string,
  data: z.infer<typeof updateHomeworkSchema>,
) {
  await requireOwnedHomework(userId, id);
  if (data.subjectId !== undefined) {
    await requireOwnedSubjectIfProvided(userId, data.subjectId);
  }
  return prisma.homework.update({ where: { id }, data, include: { subject: true } });
}

export async function deleteHomework(userId: string, id: string) {
  await requireOwnedHomework(userId, id);
  await prisma.homework.delete({ where: { id } });
}
