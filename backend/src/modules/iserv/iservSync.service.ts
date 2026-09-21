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

interface ResolvableSubject {
  id: string;
  name: string;
  iservAlias?: string | null;
}

interface ResolvedSubject {
  id: string | null;
  name: string;
}

/** Some of IServ's subject codes are a genuine prefix of the full name plus
 * a trailing course-level number ("E1" -> "Englisch", stripping the "1"
 * first since "englisch" doesn't start with "e1"). Others aren't a prefix
 * relationship at all - "bk3" for "Kunst"/"Bildende Kunst", "gm" for
 * "Gemeinschaftskunde" - they're this school's own idiosyncratic shorthand,
 * un-derivable from the name algorithmically. Rather than hardcode a
 * translation table (which would only ever fit one school), a user-supplied
 * per-Subject iservAlias is checked first as an exact match; the prefix
 * heuristic remains as a fallback for the cases it does handle for free.
 *
 * Returns the matched Subject's id (null if nothing matched, i.e. this
 * IServ subject isn't linked to a local Subject yet) alongside the display
 * name to use either way - the matched Subject's own name, or the raw
 * IServ code as a last-resort fallback. */
function resolveSubject(subjects: ResolvableSubject[], rawSubject: string): ResolvedSubject {
  const lower = rawSubject.toLowerCase();
  const aliasMatch = subjects.find((s) => s.iservAlias && s.iservAlias.toLowerCase() === lower);
  if (aliasMatch) return { id: aliasMatch.id, name: aliasMatch.name };

  const strippedLower = lower.replace(/\d+$/, "");
  const match = subjects.find((s) => {
    const subjectLower = s.name.toLowerCase();
    return (
      subjectLower === lower ||
      subjectLower.startsWith(lower) ||
      (strippedLower.length > 0 && subjectLower.startsWith(strippedLower))
    );
  });
  return match ? { id: match.id, name: match.name } : { id: null, name: rawSubject };
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
  subjectId: string | null;
  rawSubjectCode: string | null;
  room: string | null;
  startTime: string | null;
  endTime: string | null;
  teacherName: string | null;
  teacherAcronym: string | null;
  courseName: string | null;
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
  subjects: ResolvableSubject[],
  includeUnchanged = false,
): OverrideDraft[] {
  const drafts: OverrideDraft[] = [];

  for (const period of periods) {
    const slot = lessonSlotsInOrder[period.period - 1];
    if (!slot) continue;

    // Teacher/course/times always come from the base (non-substituted)
    // entry, for the Stundenplan detail view - populated regardless of
    // includeUnchanged, so a Vertretung's detail popup can still show them
    // even when IServ isn't replacing the whole manual plan.
    const baseDetails = {
      startTime: period.startTime,
      endTime: period.endTime,
      teacherName: period.teacherName,
      teacherAcronym: period.teacherAcronym,
      courseName: period.courseName,
    };

    if (!period.change) {
      if (!includeUnchanged) continue;
      const resolved = resolveSubject(subjects, period.subject);
      drafts.push({
        userId,
        date,
        timeGridSlotId: slot.id,
        type: "NORMAL",
        subjectName: resolved.name,
        subjectId: resolved.id,
        rawSubjectCode: period.subject,
        room: period.room || null,
        ...baseDetails,
      });
      continue;
    }

    const isCancelled = period.change.changeTypes.includes("0");
    if (isCancelled) {
      // The cancelled lesson's own subject (what *would* have happened) is
      // still worth resolving - the detail popup and the dashboard/grid's
      // color both want the linked Subject's own color here, not whatever
      // happens to be manually assigned in this same slot.
      const resolved = resolveSubject(subjects, period.subject);
      drafts.push({
        userId,
        date,
        timeGridSlotId: slot.id,
        type: "CANCELLED",
        // Unlike before, this is the resolved subject (not null) - a fresh
        // account may have no manually-entered TimetableSlot at all to fall
        // back on for this weekday+slot, so the cancelled lesson's own name
        // has to be able to stand on its own.
        subjectName: resolved.name,
        subjectId: resolved.id,
        rawSubjectCode: period.subject,
        room: null,
        ...baseDetails,
      });
    } else {
      const rawSubject = period.change.substitutionSubject || period.subject;
      const resolved = resolveSubject(subjects, rawSubject);
      drafts.push({
        userId,
        date,
        timeGridSlotId: slot.id,
        type: "CHANGED",
        subjectName: resolved.name,
        subjectId: resolved.id,
        rawSubjectCode: rawSubject,
        room: period.change.substitutionRoom || period.room || null,
        ...baseDetails,
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

interface CanonicalPeriod {
  startTime: string;
  endTime: string;
  label: string | null;
}

/** One "shape" per IServ period number, taken from the first occurrence
 * seen across every synced date - period times are a fixed, school-wide
 * time grid, so any single occurrence is as good as another. */
function canonicalPeriodsFrom(byDate: Map<string, IServPeriod[]>): Map<number, CanonicalPeriod> {
  const canonical = new Map<number, CanonicalPeriod>();
  for (const periods of byDate.values()) {
    for (const period of periods) {
      if (canonical.has(period.period)) continue;
      if (!period.startTime || !period.endTime) continue;
      canonical.set(period.period, {
        startTime: period.startTime,
        endTime: period.endTime,
        label: period.label,
      });
    }
  }
  return canonical;
}

/** Creates/updates LESSON-type TimeGridSlots so the Zeitraster matches
 * IServ's own period times instead of requiring the user to manually
 * recreate it - only Pausen stay purely manual, since IServ's response has
 * no concept of breaks at all. Reuses the same positional convention
 * mapPeriodsToOverrides relies on (the Nth LESSON slot, ordered by
 * sortOrder, is period N): existing lesson slots are updated in place if
 * their time/label drifted from IServ, and any period IServ reports beyond
 * the current lesson count gets a newly-created slot appended after
 * whatever's already in the grid (including any manually-placed Pausen),
 * so a Pause a user inserted between two lessons is never disturbed.
 * Returns the refreshed, sortOrder-ordered LESSON id list for the caller to
 * use in mapPeriodsToOverrides. */
export async function syncTimeGridFromIserv(
  userId: string,
  byDate: Map<string, IServPeriod[]>,
): Promise<{ id: string }[]> {
  const canonical = canonicalPeriodsFrom(byDate);
  if (canonical.size === 0) {
    return prisma.timeGridSlot.findMany({
      where: { userId, type: "LESSON" },
      orderBy: { sortOrder: "asc" },
      select: { id: true },
    });
  }

  const [existingLessons, totalSlotCount] = await Promise.all([
    prisma.timeGridSlot.findMany({
      where: { userId, type: "LESSON" },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.timeGridSlot.count({ where: { userId } }),
  ]);

  const maxPeriod = Math.max(...canonical.keys());
  let nextSortOrder = totalSlotCount;
  const creates: Parameters<typeof prisma.timeGridSlot.create>[0]["data"][] = [];
  const updates: { id: string; data: Parameters<typeof prisma.timeGridSlot.update>[0]["data"] }[] = [];

  for (let periodNumber = 1; periodNumber <= maxPeriod; periodNumber++) {
    const shape = canonical.get(periodNumber);
    if (!shape) continue;
    const existing = existingLessons[periodNumber - 1];

    if (!existing) {
      creates.push({
        userId,
        type: "LESSON",
        label: shape.label ?? `${periodNumber}. Stunde`,
        startTime: shape.startTime,
        endTime: shape.endTime,
        sortOrder: nextSortOrder++,
      });
      continue;
    }

    const label = shape.label ?? existing.label;
    if (existing.startTime !== shape.startTime || existing.endTime !== shape.endTime || existing.label !== label) {
      updates.push({ id: existing.id, data: { startTime: shape.startTime, endTime: shape.endTime, label } });
    }
  }

  if (creates.length > 0 || updates.length > 0) {
    await prisma.$transaction([
      ...creates.map((data) => prisma.timeGridSlot.create({ data })),
      ...updates.map(({ id, data }) => prisma.timeGridSlot.update({ where: { id }, data })),
    ]);
  }

  return prisma.timeGridSlot.findMany({
    where: { userId, type: "LESSON" },
    orderBy: { sortOrder: "asc" },
    select: { id: true },
  });
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
    const subjects = await prisma.subject.findMany({
      where: { userId },
      select: { id: true, name: true, iservAlias: true },
    });

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

    // Populate/update the Zeitraster's LESSON slots from IServ's own period
    // times before mapping overrides, so a fresh account (no manually
    // entered Zeitraster yet) still gets correctly positioned overrides
    // instead of every period being silently skipped for lack of a
    // matching TimeGridSlot.
    const lessonSlots = await syncTimeGridFromIserv(userId, byDate);

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
