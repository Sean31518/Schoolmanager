import { prisma } from "../../lib/prisma.js";
import * as pushService from "../push/push.service.js";

function dateOnlyISO(d: Date) {
  return d.toISOString().slice(0, 10);
}

function addDays(base: Date, days: number) {
  const d = new Date(base);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

/** Returns true the first time this exact (userId, key) pair is seen. */
async function markSentOnce(userId: string, key: string): Promise<boolean> {
  try {
    await prisma.notificationLog.create({ data: { userId, key } });
    return true;
  } catch {
    // Unique constraint on [userId, key] - already sent for this occasion.
    return false;
  }
}

/**
 * Checks for exams 1 or 3 days out and homework due tomorrow, and sends a
 * push notification for each one not already notified about (tracked via
 * NotificationLog so this is safe to call more than once - see index.ts,
 * which runs it hourly). No-ops entirely if push isn't configured.
 */
export async function runReminderCheck(now: Date = new Date()): Promise<void> {
  if (!pushService.isPushConfigured()) return;

  const in1DayKey = dateOnlyISO(addDays(now, 1));
  const in3DaysKey = dateOnlyISO(addDays(now, 3));

  const exams = await prisma.calendarEvent.findMany({
    where: { type: "EXAM" },
    include: { subject: true },
  });

  for (const exam of exams) {
    const examDateKey = dateOnlyISO(exam.startDate);
    let daysOut: 1 | 3 | null = null;
    if (examDateKey === in3DaysKey) daysOut = 3;
    else if (examDateKey === in1DayKey) daysOut = 1;
    if (daysOut === null) continue;

    const isNew = await markSentOnce(exam.userId, `exam:${exam.id}:${daysOut}d`);
    if (!isNew) continue;

    const subjectLabel = exam.subject ? `${exam.subject.name}: ` : "";
    await pushService.sendToUser(exam.userId, {
      title: daysOut === 1 ? "Klausur morgen" : `Klausur in ${daysOut} Tagen`,
      body: `${subjectLabel}${exam.title}`,
      url: "/exams",
    });
  }

  const pendingHomework = await prisma.homework.findMany({
    where: { done: false, dueDate: { not: null } },
    include: { subject: true },
  });

  for (const hw of pendingHomework) {
    if (!hw.dueDate || dateOnlyISO(hw.dueDate) !== in1DayKey) continue;

    const isNew = await markSentOnce(hw.userId, `homework:${hw.id}:1d`);
    if (!isNew) continue;

    const subjectLabel = hw.subject ? `${hw.subject.name}: ` : "";
    await pushService.sendToUser(hw.userId, {
      title: "Hausaufgabe fällig morgen",
      body: `${subjectLabel}${hw.title}`,
      url: "/",
    });
  }
}
