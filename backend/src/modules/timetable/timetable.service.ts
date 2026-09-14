import { type Weekday, weekdaySchema } from "../../lib/enums.js";
import { NotFoundError, ValidationError } from "../../lib/errors.js";
import { prisma } from "../../lib/prisma.js";

function parseWeekday(raw: string): Weekday {
  const result = weekdaySchema.safeParse(raw.toUpperCase());
  if (!result.success) {
    throw new ValidationError("Ungültiger Wochentag");
  }
  return result.data;
}

export async function getTimetable(userId: string) {
  const [timeGridSlots, timetableSlots] = await Promise.all([
    prisma.timeGridSlot.findMany({ where: { userId }, orderBy: { sortOrder: "asc" } }),
    prisma.timetableSlot.findMany({ where: { userId }, include: { subject: true } }),
  ]);

  return { timeGridSlots, timetableSlots };
}

async function requireOwnedTimeGridSlot(userId: string, timeGridSlotId: string) {
  const slot = await prisma.timeGridSlot.findFirst({
    where: { id: timeGridSlotId, userId },
  });
  if (!slot) {
    throw new NotFoundError("Zeitraster-Eintrag nicht gefunden");
  }
  return slot;
}

async function requireOwnedSubjectIfProvided(userId: string, subjectId: string | null) {
  if (!subjectId) return;
  const subject = await prisma.subject.findFirst({ where: { id: subjectId, userId } });
  if (!subject) {
    throw new NotFoundError("Fach nicht gefunden");
  }
}

interface TimetableSlotInput {
  subjectId: string | null;
  room?: string | null;
  note?: string | null;
}

export async function upsertTimetableSlot(
  userId: string,
  weekdayRaw: string,
  timeGridSlotId: string,
  data: TimetableSlotInput,
) {
  const weekday = parseWeekday(weekdayRaw);
  await requireOwnedTimeGridSlot(userId, timeGridSlotId);
  await requireOwnedSubjectIfProvided(userId, data.subjectId);

  return prisma.timetableSlot.upsert({
    where: { userId_weekday_timeGridSlotId: { userId, weekday, timeGridSlotId } },
    create: {
      userId,
      weekday,
      timeGridSlotId,
      subjectId: data.subjectId,
      room: data.room ?? null,
      note: data.note ?? null,
    },
    update: {
      subjectId: data.subjectId,
      room: data.room ?? null,
      note: data.note ?? null,
    },
    include: { subject: true },
  });
}

export async function deleteTimetableSlot(
  userId: string,
  weekdayRaw: string,
  timeGridSlotId: string,
) {
  const weekday = parseWeekday(weekdayRaw);
  await requireOwnedTimeGridSlot(userId, timeGridSlotId);

  await prisma.timetableSlot.deleteMany({
    where: { userId, weekday, timeGridSlotId },
  });
}
