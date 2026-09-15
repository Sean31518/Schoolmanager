import { NotFoundError } from "./errors.js";
import { prisma } from "./prisma.js";

export async function requireOwnedSubject(userId: string, subjectId: string) {
  const subject = await prisma.subject.findFirst({ where: { id: subjectId, userId } });
  if (!subject) {
    throw new NotFoundError("Fach nicht gefunden");
  }
  return subject;
}

export async function requireOwnedSectionType(userId: string, sectionTypeId: string) {
  const sectionType = await prisma.noteSectionType.findFirst({
    where: { id: sectionTypeId, subject: { userId } },
  });
  if (!sectionType) {
    throw new NotFoundError("Notizbereich nicht gefunden");
  }
  return sectionType;
}

export async function requireOwnedCalendarEvent(userId: string, eventId: string) {
  const event = await prisma.calendarEvent.findFirst({ where: { id: eventId, userId } });
  if (!event) {
    throw new NotFoundError("Termin nicht gefunden");
  }
  return event;
}

export async function requireOwnedTopic(userId: string, topicId: string) {
  const topic = await prisma.topic.findFirst({
    where: { id: topicId, noteSectionType: { subject: { userId } } },
  });
  if (!topic) {
    throw new NotFoundError("Thema nicht gefunden");
  }
  return topic;
}

export async function requireOwnedNote(userId: string, noteId: string) {
  const note = await prisma.note.findFirst({
    where: { id: noteId, topic: { noteSectionType: { subject: { userId } } } },
  });
  if (!note) {
    throw new NotFoundError("Notiz nicht gefunden");
  }
  return note;
}
