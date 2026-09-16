import type { z } from "zod";
import { NotFoundError } from "../../lib/errors.js";
import { requireOwnedNote } from "../../lib/ownership.js";
import { prisma } from "../../lib/prisma.js";
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
  linkedNote: {
    include: { topic: { include: { noteSectionType: { include: { subject: true } } } } },
  },
};

async function requireOwnedNoteIfProvided(userId: string, noteId: string | null | undefined) {
  if (!noteId) return;
  await requireOwnedNote(userId, noteId);
}

export function mapHomework<
  T extends {
    linkedNote:
      | null
      | {
          id: string;
          title: string;
          topic: {
            id: string;
            name: string;
            noteSectionType: {
              id: string;
              name: string;
              subject: { id: string; name: string; color: string };
            };
          };
        };
  },
>(homework: T) {
  const { linkedNote, ...rest } = homework;
  return {
    ...rest,
    linkedNote: linkedNote
      ? {
          id: linkedNote.id,
          title: linkedNote.title,
          topicId: linkedNote.topic.id,
          topicName: linkedNote.topic.name,
          sectionTypeId: linkedNote.topic.noteSectionType.id,
          sectionTypeName: linkedNote.topic.noteSectionType.name,
          subjectId: linkedNote.topic.noteSectionType.subject.id,
          subjectName: linkedNote.topic.noteSectionType.subject.name,
          subjectColor: linkedNote.topic.noteSectionType.subject.color,
        }
      : null,
  };
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
  await requireOwnedNoteIfProvided(userId, data.linkedNoteId);
  const homework = await prisma.homework.create({
    data: {
      userId,
      title: data.title,
      subjectId: data.subjectId ?? null,
      dueDate: data.dueDate ?? null,
      note: data.note ?? null,
      linkedNoteId: data.linkedNoteId ?? null,
    },
    include: withSubtasks,
  });
  return mapHomework(homework);
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
  if (data.linkedNoteId !== undefined) {
    await requireOwnedNoteIfProvided(userId, data.linkedNoteId);
  }
  const homework = await prisma.homework.update({ where: { id }, data, include: withSubtasks });
  return mapHomework(homework);
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
