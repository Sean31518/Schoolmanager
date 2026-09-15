import type { z } from "zod";
import { ValidationError } from "../../lib/errors.js";
import { requireOwnedCalendarEvent, requireOwnedNote } from "../../lib/ownership.js";
import { prisma } from "../../lib/prisma.js";
import type { saveExamPrepSchema } from "./examPrep.schema.js";

const fileSelect = { id: true, originalName: true, mimeType: true, size: true } as const;

const noteWithContext = {
  blocks: { orderBy: { sortOrder: "asc" as const }, include: { file: { select: fileSelect } } },
  topic: {
    include: {
      noteSectionType: { include: { subject: true } },
      gradeLevels: { orderBy: { gradeLevel: "asc" } },
    },
  },
} as const;

function mapNote(note: {
  id: string;
  title: string;
  blocks: {
    id: string;
    type: string;
    sortOrder: number;
    contentJson: string | null;
    fileId: string | null;
    pageNumber: number | null;
    url: string | null;
    file: { id: string; originalName: string; mimeType: string; size: number } | null;
  }[];
  topic: {
    id: string;
    name: string;
    gradeLevels: { gradeLevel: number }[];
    noteSectionType: { id: string; name: string; subject: { id: string; name: string; color: string } };
  };
}) {
  return {
    noteId: note.id,
    title: note.title,
    topicId: note.topic.id,
    topicName: note.topic.name,
    gradeLevels: note.topic.gradeLevels.map((g) => g.gradeLevel),
    blocks: note.blocks.map((block) => ({
      ...block,
      contentJson: block.contentJson !== null ? (JSON.parse(block.contentJson) as unknown) : null,
    })),
    sectionTypeId: note.topic.noteSectionType.id,
    sectionTypeName: note.topic.noteSectionType.name,
    subjectId: note.topic.noteSectionType.subject.id,
    subjectName: note.topic.noteSectionType.subject.name,
    subjectColor: note.topic.noteSectionType.subject.color,
  };
}

export async function getExamPrep(userId: string, eventId: string) {
  await requireOwnedCalendarEvent(userId, eventId);

  const items = await prisma.examPrepItem.findMany({
    where: { calendarEventId: eventId },
    include: { note: { include: noteWithContext } },
    orderBy: { createdAt: "asc" },
  });

  return items.map((item) => ({
    id: item.id,
    sectionIndex: item.sectionIndex,
    sectionLabel: item.sectionLabel,
    ...mapNote(item.note),
  }));
}

export async function saveExamPrep(
  userId: string,
  eventId: string,
  data: z.infer<typeof saveExamPrepSchema>,
) {
  await requireOwnedCalendarEvent(userId, eventId);

  const uniqueNoteIds = [...new Set(data.items.map((item) => item.noteId))];
  for (const noteId of uniqueNoteIds) {
    await requireOwnedNote(userId, noteId);
  }

  const seen = new Set<string>();
  for (const item of data.items) {
    const key = `${item.noteId}:${item.sectionIndex}`;
    if (seen.has(key)) {
      throw new ValidationError("Doppelte Auswahl für dieselbe Notiz/Abschnitt-Kombination");
    }
    seen.add(key);
  }

  await prisma.$transaction([
    prisma.examPrepItem.deleteMany({ where: { calendarEventId: eventId } }),
    ...data.items.map((item) =>
      prisma.examPrepItem.create({
        data: {
          calendarEventId: eventId,
          noteId: item.noteId,
          sectionIndex: item.sectionIndex,
          sectionLabel: item.sectionLabel,
        },
      }),
    ),
  ]);

  return getExamPrep(userId, eventId);
}

export async function getExamPrepCandidates(userId: string, eventId: string, allSubjects: boolean) {
  const event = await requireOwnedCalendarEvent(userId, eventId);

  const notes = await prisma.note.findMany({
    where: {
      topic: {
        noteSectionType: {
          subject: {
            userId,
            ...(event.subjectId && !allSubjects ? { id: event.subjectId } : {}),
          },
        },
      },
    },
    include: noteWithContext,
    orderBy: [
      { topic: { noteSectionType: { subject: { name: "asc" } } } },
      { topic: { name: "asc" } },
    ],
  });

  return notes.map(mapNote);
}
