import { NotFoundError } from "./errors.js";
import { prisma } from "./prisma.js";

export async function requireOwnedSubject(userId: string, subjectId: string) {
  const subject = await prisma.subject.findFirst({ where: { id: subjectId, userId } });
  if (!subject) {
    throw new NotFoundError("Fach nicht gefunden");
  }
  return subject;
}

export async function requireOwnedCalendarEvent(userId: string, eventId: string) {
  const event = await prisma.calendarEvent.findFirst({ where: { id: eventId, userId } });
  if (!event) {
    throw new NotFoundError("Termin nicht gefunden");
  }
  return event;
}
