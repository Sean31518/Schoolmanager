import type { z } from "zod";
import { NotFoundError } from "../../lib/errors.js";
import { prisma } from "../../lib/prisma.js";
import { linksInclude, syncLinks, withMappedLinks } from "../links/links.service.js";
import type {
  createHomeworkSchema,
  createSubtaskSchema,
  updateHomeworkSchema,
  updateSubtaskSchema,
} from "./homework.schema.js";

interface ListFilters {
  done?: boolean;
  subjectId?: string;
}

export const withSubtasks = {
  subject: true,
  subtasks: { orderBy: { sortOrder: "asc" as const } },
  ...linksInclude,
};

export const mapHomework = withMappedLinks;

async function getHomework(id: string) {
  return mapHomework(await prisma.homework.findUniqueOrThrow({ where: { id }, include: withSubtasks }));
}

export async function listHomework(userId: string, filters: ListFilters) {
  const homework = await prisma.homework.findMany({
    where: {
      userId,
      ...(filters.done !== undefined ? { done: filters.done } : {}),
      ...(filters.subjectId ? { subjectId: filters.subjectId } : {}),
    },
    include: withSubtasks,
    orderBy: [{ done: "asc" }, { dueDate: "asc" }],
  });
  return homework.map(mapHomework);
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
  const homework = await prisma.homework.create({
    data: {
      userId,
      title: data.title,
      subjectId: data.subjectId ?? null,
      dueDate: data.dueDate ?? null,
      note: data.note ?? null,
    },
  });
  if (data.links) await syncLinks(userId, { homeworkId: homework.id }, data.links);
  return getHomework(homework.id);
}

export async function requireOwnedHomework(userId: string, id: string) {
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
  const { links, ...fields } = data;
  await prisma.homework.update({ where: { id }, data: fields });
  if (links) await syncLinks(userId, { homeworkId: id }, links);
  return getHomework(id);
}

export async function deleteHomework(userId: string, id: string) {
  await requireOwnedHomework(userId, id);
  await prisma.homework.delete({ where: { id } });
}

async function requireOwnedSubtask(userId: string, subtaskId: string) {
  const subtask = await prisma.homeworkSubtask.findFirst({
    where: { id: subtaskId, homework: { userId } },
  });
  if (!subtask) {
    throw new NotFoundError("Unteraufgabe nicht gefunden");
  }
  return subtask;
}

export async function createSubtask(
  userId: string,
  homeworkId: string,
  data: z.infer<typeof createSubtaskSchema>,
) {
  await requireOwnedHomework(userId, homeworkId);
  const count = await prisma.homeworkSubtask.count({ where: { homeworkId } });
  return prisma.homeworkSubtask.create({
    data: { homeworkId, title: data.title, sortOrder: count },
  });
}

export async function updateSubtask(
  userId: string,
  subtaskId: string,
  data: z.infer<typeof updateSubtaskSchema>,
) {
  await requireOwnedSubtask(userId, subtaskId);
  return prisma.homeworkSubtask.update({ where: { id: subtaskId }, data });
}

export async function deleteSubtask(userId: string, subtaskId: string) {
  await requireOwnedSubtask(userId, subtaskId);
  await prisma.homeworkSubtask.delete({ where: { id: subtaskId } });
}
