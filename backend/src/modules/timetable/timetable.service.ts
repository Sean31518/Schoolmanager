import { weekdays, type Weekday, weekdaySchema } from "../../lib/enums.js";
import { NotFoundError, ValidationError } from "../../lib/errors.js";
import { prisma } from "../../lib/prisma.js";

function parseWeekday(raw: string): Weekday {
  const result = weekdaySchema.safeParse(raw.toUpperCase());
  if (!result.success) {
    throw new ValidationError("Ungültiger Wochentag");
  }
  return result.data;
}

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Monday-Friday dates of the week containing `now`, keyed by weekday name -
 * used to look up this week's IServ overrides for the read-only weekly grid,
 * which (unlike the dashboard) shows all weekdays at once rather than one
 * specific date. */
function currentWeekWeekdayDates(now: Date): Partial<Record<Weekday, Date>> {
  const jsDay = now.getUTCDay(); // 0=Sun..6=Sat
  const mondayOffset = jsDay === 0 ? -6 : 1 - jsDay;
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  monday.setUTCDate(monday.getUTCDate() + mondayOffset);

  const result: Partial<Record<Weekday, Date>> = {};
  weekdays.forEach((weekday, i) => {
    if (weekday === "SATURDAY" || weekday === "SUNDAY") return;
    const d = new Date(monday);
    d.setUTCDate(d.getUTCDate() + i);
    result[weekday] = d;
  });
  return result;
}

/** IServ-sourced info for one weekday+slot in the CURRENT calendar week -
 * layered onto the recurring manual plan for display in TimetableView, never
 * used by the editor (TimetableGrid), which always reads/writes the
 * underlying manual timetableSlots regardless of this. CANCELLED/CHANGED
 * entries show regardless of the iservActive toggle (same as the dashboard
 * widget); NORMAL entries (IServ's own unmodified schedule replacing the
 * manual one) only show while the toggle is currently on, checked at read
 * time so flipping it off reverts immediately without needing a new sync. */
export interface IservOverlayEntry {
  weekday: Weekday;
  timeGridSlotId: string;
  type: "CANCELLED" | "CHANGED" | "NORMAL";
  subjectName: string | null;
  subjectId: string | null;
  subjectColor: string | null;
  rawSubjectCode: string | null;
  room: string | null;
  substituteRoom: string | null;
  startTime: string | null;
  endTime: string | null;
  teacherName: string | null;
  teacherAcronym: string | null;
  substituteTeacherName: string | null;
  substituteTeacherAcronym: string | null;
  courseName: string | null;
}

export async function getTimetable(userId: string, now: Date = new Date()) {
  const [timeGridSlots, timetableSlots, settings] = await Promise.all([
    prisma.timeGridSlot.findMany({ where: { userId }, orderBy: { sortOrder: "asc" } }),
    prisma.timetableSlot.findMany({ where: { userId }, include: { subject: true } }),
    prisma.settings.findUnique({ where: { userId } }),
  ]);

  const weekDates = currentWeekWeekdayDates(now);
  const dateKeyToWeekday = new Map(
    Object.entries(weekDates).map(([weekday, date]) => [toDateKey(date), weekday as Weekday]),
  );

  const overrides = await prisma.timetableOverride.findMany({
    where: { userId, date: { in: Object.values(weekDates) } },
    include: { subject: true },
  });

  const iservOverlay: IservOverlayEntry[] = overrides
    .filter((o) => o.type !== "NORMAL" || settings?.iservActive)
    .map((o) => ({
      weekday: dateKeyToWeekday.get(toDateKey(o.date))!,
      timeGridSlotId: o.timeGridSlotId,
      type: o.type as "CANCELLED" | "CHANGED" | "NORMAL",
      subjectName: o.subjectName,
      subjectId: o.subjectId,
      subjectColor: o.subject?.color ?? null,
      rawSubjectCode: o.rawSubjectCode,
      room: o.room,
      substituteRoom: o.substituteRoom,
      startTime: o.startTime,
      endTime: o.endTime,
      teacherName: o.teacherName,
      teacherAcronym: o.teacherAcronym,
      substituteTeacherName: o.substituteTeacherName,
      substituteTeacherAcronym: o.substituteTeacherAcronym,
      courseName: o.courseName,
    }));

  return { timeGridSlots, timetableSlots, iservOverlay, iservActive: Boolean(settings?.iservActive) };
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
