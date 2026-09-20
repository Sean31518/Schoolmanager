import { weekdays } from "../../lib/enums.js";
import { prisma } from "../../lib/prisma.js";
import { mapHomework, withSubtasks } from "../homework/homework.service.js";
import { getTimetable } from "../timetable/timetable.service.js";

function weekdayFor(date: Date) {
  const jsDay = date.getDay(); // 0=Sunday..6=Saturday
  return jsDay === 0 ? "SUNDAY" : weekdays[jsDay - 1];
}

const GERMAN_WEEKDAY_LABELS: Record<string, string> = {
  MONDAY: "MONTAG",
  TUESDAY: "DIENSTAG",
  WEDNESDAY: "MITTWOCH",
  THURSDAY: "DONNERSTAG",
  FRIDAY: "FREITAG",
  SATURDAY: "SAMSTAG",
  SUNDAY: "SONNTAG",
};

function isSameCalendarDay(a: Date, b: Date) {
  return a.toDateString() === b.toDateString();
}

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function dateKeyToMidnightUTC(dateKey: string): Date {
  return new Date(`${dateKey}T00:00:00.000Z`);
}

function isWeekend(date: Date) {
  const jsDay = date.getDay();
  return jsDay === 0 || jsDay === 6;
}

/** Today if it's a weekday, otherwise the next Monday - there's no lesson
 * data for Sat/Sun, so showing them would just be an empty widget. */
function nextWeekday(date: Date): Date {
  const d = new Date(date);
  while (isWeekend(d)) {
    d.setDate(d.getDate() + 1);
  }
  return d;
}

/** The weekday after `date`, itself rolled forward past any weekend - so
 * Friday's "tomorrow" is Monday, not Saturday. */
function nextWeekdayAfter(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + 1);
  return nextWeekday(d);
}

export async function getDashboard(userId: string, now: Date = new Date()) {
  const settings = await prisma.settings.findUnique({ where: { userId } });
  const currentGradeLevel = settings?.currentGradeLevel ?? 5;

  const [upcomingHomeworkRaw, upcomingEvents, generalNotesRaw, recentNotes, { timeGridSlots, timetableSlots }] =
    await Promise.all([
      prisma.homework.findMany({
        where: { userId, done: false },
        include: withSubtasks,
        orderBy: [{ dueDate: "asc" }],
        take: 10,
      }),
      prisma.calendarEvent.findMany({
        where: { userId, startDate: { gte: now }, type: { in: ["MANUAL", "EXAM"] } },
        include: { subject: true },
        orderBy: { startDate: "asc" },
        take: 10,
      }),
      prisma.generalNote.findMany({ where: { userId }, orderBy: { sortOrder: "asc" } }),
      prisma.note.findMany({
        where: { topic: { noteSectionType: { subject: { userId } } }, lastViewedAt: { not: null } },
        orderBy: { lastViewedAt: "desc" },
        take: 5,
        include: { topic: { include: { noteSectionType: { include: { subject: true } } } } },
      }),
      getTimetable(userId),
    ]);

  const upcomingHomework = upcomingHomeworkRaw.map(mapHomework);

  const generalNotes = generalNotesRaw.map((note) => ({
    ...note,
    contentJson: JSON.parse(note.contentJson) as unknown,
  }));

  // Reminder feed: homework (due date) + calendar events (start date, holidays
  // excluded since they're not "things to do"), merged and sorted by date.
  const homeworkReminders = upcomingHomework
    .filter((hw) => hw.dueDate !== null)
    .map((hw) => ({
      kind: "homework" as const,
      id: hw.id,
      title: hw.title,
      date: hw.dueDate!.toISOString(),
      subjectName: hw.subject?.name ?? null,
      subjectColor: hw.subject?.color ?? null,
    }));
  const eventReminders = upcomingEvents.map((event) => ({
    kind: "event" as const,
    id: event.id,
    title: event.title,
    date: event.startDate.toISOString(),
    subjectName: event.subject?.name ?? null,
    subjectColor: event.subject?.color ?? null,
  }));
  const upcomingReminders = [...homeworkReminders, ...eventReminders]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5);

  const dayA = nextWeekday(now);
  const dayB = nextWeekdayAfter(dayA);
  const dayAKey = toDateKey(dayA);
  const dayBKey = toDateKey(dayB);

  // IServ-synced Vertretungen (see modules/iserv) for the two dates being
  // shown, keyed by "dateKey:timeGridSlotId" for O(1) lookup per slot.
  const overrides = await prisma.timetableOverride.findMany({
    where: {
      userId,
      date: { in: [dateKeyToMidnightUTC(dayAKey), dateKeyToMidnightUTC(dayBKey)] },
    },
  });
  const overrideByKey = new Map(
    overrides.map((o) => [`${toDateKey(o.date)}:${o.timeGridSlotId}`, o]),
  );

  // Today/tomorrow timetable: reuse the same slot data the Stundenplan
  // pages already fetch, just filtered down to the relevant weekday(s).
  // Every slot is included (breaks and free periods too) so the dashboard
  // widget always shows what's currently going on, not just lessons.
  // Vertretungen are layered on top of the regular recurring TimetableSlot
  // for the exact date being shown, not stored as a separate list.
  function slotsForDate(weekday: string, dateKey: string) {
    return timeGridSlots.map((slot) => {
      if (slot.type === "BREAK") {
        return {
          type: "BREAK" as const,
          label: slot.label,
          startTime: slot.startTime,
          endTime: slot.endTime,
          subjectName: null,
          subjectColor: null,
        };
      }
      const cell = timetableSlots.find(
        (s) => s.weekday === weekday && s.timeGridSlotId === slot.id,
      );
      const override = overrideByKey.get(`${dateKey}:${slot.id}`);

      if (override?.type === "CANCELLED") {
        return {
          type: "LESSON" as const,
          label: slot.label,
          startTime: slot.startTime,
          endTime: slot.endTime,
          subjectName: cell?.subject?.name ?? null,
          subjectColor: cell?.subject?.color ?? null,
          vertretung: "CANCELLED" as const,
        };
      }
      if (override?.type === "CHANGED") {
        return {
          type: "LESSON" as const,
          label: slot.label,
          startTime: slot.startTime,
          endTime: slot.endTime,
          subjectName: override.subjectName ?? cell?.subject?.name ?? null,
          subjectColor: cell?.subject?.color ?? null,
          room: override.room,
          vertretung: "CHANGED" as const,
        };
      }
      return {
        type: "LESSON" as const,
        label: slot.label,
        startTime: slot.startTime,
        endTime: slot.endTime,
        subjectName: cell?.subject?.name ?? null,
        subjectColor: cell?.subject?.color ?? null,
      };
    });
  }

  const todayTimetable = slotsForDate(weekdayFor(dayA), dayAKey);
  const tomorrowTimetable = slotsForDate(weekdayFor(dayB), dayBKey);

  // The widget's toggle button says "HEUTE"/"MORGEN" only when that's
  // actually true - on a weekend (or a Friday's "tomorrow"), dayA/dayB
  // have rolled forward past the real today/tomorrow, so the button shows
  // the actual weekday name instead (e.g. "MONTAG") to avoid lying about
  // what's being displayed.
  const trueTomorrow = new Date(now);
  trueTomorrow.setDate(trueTomorrow.getDate() + 1);
  const todayLabel = isSameCalendarDay(dayA, now) ? "HEUTE" : GERMAN_WEEKDAY_LABELS[weekdayFor(dayA)];
  const tomorrowLabel = isSameCalendarDay(dayB, trueTomorrow)
    ? "MORGEN"
    : GERMAN_WEEKDAY_LABELS[weekdayFor(dayB)];

  const recentlyViewedNotes = recentNotes.map((note) => ({
    id: note.id,
    title: note.title,
    lastViewedAt: note.lastViewedAt!.toISOString(),
    topicId: note.topic.id,
    topicName: note.topic.name,
    sectionTypeId: note.topic.noteSectionType.id,
    sectionTypeName: note.topic.noteSectionType.name,
    subjectId: note.topic.noteSectionType.subject.id,
    subjectName: note.topic.noteSectionType.subject.name,
    subjectColor: note.topic.noteSectionType.subject.color,
  }));

  return {
    currentGradeLevel,
    upcomingHomework,
    generalNotes,
    upcomingReminders,
    todayTimetable,
    tomorrowTimetable,
    todayLabel,
    tomorrowLabel,
    recentlyViewedNotes,
  };
}
