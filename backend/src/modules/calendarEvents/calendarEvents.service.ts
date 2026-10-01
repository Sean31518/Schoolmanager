import type { z } from "zod";
import { NotFoundError } from "../../lib/errors.js";
import { requireOwnedCalendarEvent } from "../../lib/ownership.js";
import { prisma } from "../../lib/prisma.js";
import { linksInclude, syncLinks, withMappedLinks } from "../links/links.service.js";
import type {
  createCalendarEventSchema,
  listCalendarEventsQuerySchema,
  updateCalendarEventSchema,
} from "./calendarEvents.schema.js";

type ListFilters = z.infer<typeof listCalendarEventsQuerySchema>;

// For a Klausur the links are its Lernstoff (Hefte and page ranges).
const eventInclude = { subject: true, ...linksInclude };

async function getEvent(id: string) {
  return withMappedLinks(await prisma.calendarEvent.findUniqueOrThrow({ where: { id }, include: eventInclude }));
}

export async function listCalendarEvents(userId: string, filters: ListFilters) {
  const events = await prisma.calendarEvent.findMany({
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
    include: eventInclude,
    orderBy: { startDate: "asc" },
  });
  return events.map(withMappedLinks);
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
  const event = await prisma.calendarEvent.create({
    data: {
      userId,
      title: data.title,
      type: data.type,
      startDate: data.startDate,
      endDate: data.endDate ?? null,
      allDay: data.allDay ?? true,
      startTime: data.startTime ?? null,
      endTime: data.endTime ?? null,
      subjectId: data.subjectId ?? null,
      color: data.color ?? null,
      note: data.note ?? null,
    },
  });
  if (data.links) await syncLinks(userId, { calendarEventId: event.id }, data.links);
  return getEvent(event.id);
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
  const { links, ...fields } = data;
  await prisma.calendarEvent.update({ where: { id }, data: fields });
  if (links) await syncLinks(userId, { calendarEventId: id }, links);
  return getEvent(id);
}

export async function deleteCalendarEvent(userId: string, id: string) {
  await requireOwnedCalendarEvent(userId, id);
  await prisma.calendarEvent.delete({ where: { id } });
}
