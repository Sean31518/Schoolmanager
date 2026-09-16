import { weekdays } from "../../lib/enums.js";
import { prisma } from "../../lib/prisma.js";
import { mapHomework, withSubtasks } from "../homework/homework.service.js";
import { getTimetable } from "../timetable/timetable.service.js";

function weekdayFor(date: Date) {
  const jsDay = date.getDay(); // 0=Sunday..6=Saturday
  return jsDay === 0 ? "SUNDAY" : weekdays[jsDay - 1];
}

export async function getDashboard(userId: string) {
  const settings = await prisma.settings.findUnique({ where: { userId } });
  const currentGradeLevel = settings?.currentGradeLevel ?? 5;

  const now = new Date();

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

  // Today/tomorrow timetable: reuse the same slot data the Stundenplan
  // pages already fetch, just filtered down to the relevant weekday(s).
  // Every slot is included (breaks and free periods too) so the dashboard
  // widget always shows what's currently going on, not just lessons.
  function slotsForWeekday(weekday: string) {
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

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const todayTimetable = slotsForWeekday(weekdayFor(now));
  const tomorrowTimetable = slotsForWeekday(weekdayFor(tomorrow));

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
    recentlyViewedNotes,
  };
}
