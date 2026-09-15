import type { z } from "zod";
import { NotFoundError } from "../../lib/errors.js";
import { requireOwnedCalendarEvent } from "../../lib/ownership.js";
import { prisma } from "../../lib/prisma.js";
import type {
  createCalendarEventSchema,
  listCalendarEventsQuerySchema,
  updateCalendarEventSchema,
} from "./calendarEvents.schema.js";

type ListFilters = z.infer<typeof listCalendarEventsQuerySchema>;

export async function listCalendarEvents(userId: string, filters: ListFilters) {
  return prisma.calendarEvent.findMany({
    where: {
      userId,
      ...(filters.type ? { type: filters.type } : {}),
      ...(filters.from || filters.to
        ? {
            startDate: {
              ...(filters.from ? { gte: filters.from } : {}),
              ...(filters.to ? { lte: filters.to } : {}),
            },
          }
        : {}),
    },
    include: { subject: true },
    orderBy: { startDate: "asc" },
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

export async function createCalendarEvent(
  userId: string,
  data: z.infer<typeof createCalendarEventSchema>,
) {
  await requireOwnedSubjectIfProvided(userId, data.subjectId);
  return prisma.calendarEvent.create({
    data: {
      userId,
      title: data.title,
      type: data.type,
      startDate: data.startDate,
      endDate: data.endDate ?? null,
      allDay: data.allDay ?? true,
      subjectId: data.subjectId ?? null,
      note: data.note ?? null,
    },
    include: { subject: true },
  });
}

export async function updateCalendarEvent(
  userId: string,
  id: string,
  data: z.infer<typeof updateCalendarEventSchema>,
) {
  await requireOwnedCalendarEvent(userId, id);
  if (data.subjectId !== undefined) {
    await requireOwnedSubjectIfProvided(userId, data.subjectId);
  }
  return prisma.calendarEvent.update({ where: { id }, data, include: { subject: true } });
}

export async function deleteCalendarEvent(userId: string, id: string) {
  await requireOwnedCalendarEvent(userId, id);
  await prisma.calendarEvent.delete({ where: { id } });
}
