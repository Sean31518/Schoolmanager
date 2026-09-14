import { prisma } from "../../lib/prisma.js";
import { fetchSchoolHolidays } from "./ferienApiClient.js";
import { fetchPublicHolidays } from "./nagerDateClient.js";
import { toNagerCountyCode } from "./stateCodeMap.js";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

interface HolidayEntry {
  title: string;
  type: "HOLIDAY" | "PUBLIC_HOLIDAY";
  startDate: Date;
  endDate: Date | null;
  externalRef: string;
}

export interface ImportHolidaysResult {
  imported: number;
  updated: number;
  skipped: number;
  errors: string[];
}

export async function importHolidays(
  userId: string,
  year: number,
  federalState: string,
): Promise<ImportHolidaysResult> {
  const result: ImportHolidaysResult = { imported: 0, updated: 0, skipped: 0, errors: [] };
  const countyCode = toNagerCountyCode(federalState);
  const entries: HolidayEntry[] = [];

  try {
    const publicHolidays = await fetchPublicHolidays(year);
    for (const holiday of publicHolidays) {
      if (holiday.counties && !holiday.counties.includes(countyCode)) {
        continue;
      }
      entries.push({
        title: holiday.localName,
        type: "PUBLIC_HOLIDAY",
        startDate: new Date(`${holiday.date}T00:00:00.000Z`),
        endDate: null,
        externalRef: `nager:${year}:${slugify(holiday.localName)}`,
      });
    }
  } catch (err) {
    result.errors.push(
      `Feiertage konnten nicht geladen werden: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  try {
    const schoolHolidays = await fetchSchoolHolidays(federalState, year);
    for (const holiday of schoolHolidays) {
      entries.push({
        title: holiday.name,
        type: "HOLIDAY",
        startDate: new Date(`${holiday.start}T00:00:00.000Z`),
        endDate: new Date(`${holiday.end}T00:00:00.000Z`),
        externalRef: `ferien:${federalState}:${year}:${slugify(holiday.name)}`,
      });
    }
  } catch (err) {
    result.errors.push(
      `Schulferien konnten nicht geladen werden: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  for (const entry of entries) {
    const existing = await prisma.calendarEvent.findUnique({
      where: { userId_externalRef: { userId, externalRef: entry.externalRef } },
    });

    if (existing) {
      const changed =
        existing.title !== entry.title ||
        existing.startDate.getTime() !== entry.startDate.getTime() ||
        (existing.endDate?.getTime() ?? null) !== (entry.endDate?.getTime() ?? null);

      if (changed) {
        await prisma.calendarEvent.update({
          where: { id: existing.id },
          data: { title: entry.title, startDate: entry.startDate, endDate: entry.endDate },
        });
        result.updated += 1;
      } else {
        result.skipped += 1;
      }
    } else {
      await prisma.calendarEvent.create({
        data: {
          userId,
          title: entry.title,
          type: entry.type,
          startDate: entry.startDate,
          endDate: entry.endDate,
          allDay: true,
          externalRef: entry.externalRef,
        },
      });
      result.imported += 1;
    }
  }

  return result;
}
