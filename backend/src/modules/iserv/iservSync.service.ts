import { decryptSecret, isCredentialsEncryptionConfigured } from "../../lib/credentialsCrypto.js";
import { prisma } from "../../lib/prisma.js";
import { fetchIServTimetable, type IServPeriod } from "./iservClient.js";

const SYNC_DAYS_AHEAD = 7;

interface IservSettings {
  iservHost: string | null;
  iservUsername: string | null;
  iservPasswordEncrypted: string | null;
  iservClass: string | null;
}

export function isIservConfigured(settings: IservSettings): boolean {
  return Boolean(settings.iservHost && settings.iservUsername && settings.iservPasswordEncrypted);
}

function resolveSubjectName(subjects: { name: string }[], rawSubject: string): string {
  const lower = rawSubject.toLowerCase();
  const match = subjects.find(
    (s) => s.name.toLowerCase() === lower || s.name.toLowerCase().startsWith(lower),
  );
  return match?.name ?? rawSubject;
}

function datesToSync(from: Date, days: number): Date[] {
  const result: Date[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(from);
    d.setDate(d.getDate() + i);
    result.push(d);
  }
  return result;
}

function dateKeyToDate(dateKey: string): Date {
  return new Date(`${dateKey}T00:00:00.000Z`);
}

interface OverrideDraft {
  userId: string;
  date: Date;
  timeGridSlotId: string;
  type: "CANCELLED" | "CHANGED" | "NORMAL";
  subjectName: string | null;
  room: string | null;
}

/** Maps one day's IServ periods to override rows. Period numbers are
 * 1-indexed and matched positionally against the user's own LESSON-type
 * TimeGridSlots ordered by sortOrder, since IServ's period number has no
 * other correlation to this app's own time grid.
 *
 * By default (includeUnchanged=false), periods without a `change` are a
 * normal, unmodified lesson and produce nothing - Vertretungen are layered
 * on top of the manually-entered weekly plan. With includeUnchanged=true
 * (the "IServ replaces the manual plan" toggle), every period produces a
 * draft - unchanged ones as type "NORMAL", carrying IServ's own subject/room
 * so IServ's schedule fully replaces the manual one, not just deviations
 * from it. */
export function mapPeriodsToOverrides(
  userId: string,
  date: Date,
  periods: IServPeriod[],
  lessonSlotsInOrder: { id: string }[],
  subjects: { name: string }[],
  includeUnchanged = false,
): OverrideDraft[] {
  const drafts: OverrideDraft[] = [];

  for (const period of periods) {
    const slot = lessonSlotsInOrder[period.period - 1];
    if (!slot) continue;

    if (!period.change) {
      if (!includeUnchanged) continue;
      drafts.push({
        userId,
        date,
        timeGridSlotId: slot.id,
        type: "NORMAL",
        subjectName: resolveSubjectName(subjects, period.subject),
        room: period.room || null,
      });
      continue;
    }

    const isCancelled = period.change.changeTypes.includes("0");
    if (isCancelled) {
      drafts.push({
        userId,
        date,
        timeGridSlotId: slot.id,
        type: "CANCELLED",
        subjectName: null,
        room: null,
      });
    } else {
      const rawSubject = period.change.substitutionSubject || period.subject;
      drafts.push({
        userId,
        date,
        timeGridSlotId: slot.id,
        type: "CHANGED",
        subjectName: resolveSubjectName(subjects, rawSubject),
        room: period.change.substitutionRoom || period.room || null,
      });
    }
  }

  return drafts;
}

async function applyDayOverrides(userId: string, date: Date, drafts: OverrideDraft[]): Promise<void> {
  await prisma.$transaction([
    prisma.timetableOverride.deleteMany({ where: { userId, date } }),
    ...drafts.map((draft) => prisma.timetableOverride.create({ data: draft })),
  ]);
}

/** Syncs a single user's IServ Vertretungsplan into TimetableOverride rows
 * for the next SYNC_DAYS_AHEAD days. Never throws - failures are recorded
 * on Settings.iservLastSyncError so they're visible in the UI, since
 * silently swallowing errors (as the reference implementation this is
 * based on does) makes wrong/missing credentials indistinguishable from
 * IServ being briefly unreachable. */
export async function syncUserIservTimetable(userId: string, now: Date = new Date()): Promise<void> {
  const settings = await prisma.settings.findUnique({ where: { userId } });
  if (!settings || !isIservConfigured(settings)) return;

  if (!isCredentialsEncryptionConfigured()) {
    await prisma.settings.update({
      where: { userId },
      data: {
        iservLastSyncError:
          "Server-seitige Verschlüsselung (CREDENTIALS_ENCRYPTION_KEY) ist nicht konfiguriert.",
      },
    });
    return;
  }

  try {
    const [lessonSlots, subjects] = await Promise.all([
      prisma.timeGridSlot.findMany({
        where: { userId, type: "LESSON" },
        orderBy: { sortOrder: "asc" },
        select: { id: true },
      }),
      prisma.subject.findMany({ where: { userId }, select: { name: true } }),
    ]);

    const password = decryptSecret(settings.iservPasswordEncrypted!);
    const dates = datesToSync(now, SYNC_DAYS_AHEAD);
    const byDate = await fetchIServTimetable(
      {
        host: settings.iservHost!,
        username: settings.iservUsername!,
        password,
        schoolClass: settings.iservClass,
      },
      dates,
    );

    for (const [dateKey, periods] of byDate) {
      const date = dateKeyToDate(dateKey);
      const drafts = mapPeriodsToOverrides(
        userId,
        date,
        periods,
        lessonSlots,
        subjects,
        settings.iservActive,
      );
      await applyDayOverrides(userId, date, drafts);
    }

    await prisma.settings.update({
      where: { userId },
      data: { iservLastSyncAt: new Date(), iservLastSyncError: null },
    });
  } catch (err) {
    await prisma.settings.update({
      where: { userId },
      data: {
        iservLastSyncError: err instanceof Error ? err.message : "Unbekannter Fehler beim IServ-Sync.",
      },
    });
  }
}

export async function runIservSyncForAllUsers(now: Date = new Date()): Promise<void> {
  // The scheduled job only runs for users who've explicitly turned the
  // integration on - saved credentials alone don't trigger background
  // syncing, so toggling off pauses it without losing them. Manual
  // "Jetzt synchronisieren" (triggerIservSync) bypasses this and works off
  // isIservConfigured() alone, since it's a deliberate, one-off action.
  const usersWithIserv = await prisma.settings.findMany({
    where: {
      iservHost: { not: null },
      iservUsername: { not: null },
      iservPasswordEncrypted: { not: null },
      iservActive: true,
    },
    select: { userId: true },
  });

  for (const { userId } of usersWithIserv) {
    await syncUserIservTimetable(userId, now);
  }
}
