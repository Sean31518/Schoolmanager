import { prisma } from "../../lib/prisma.js";
import type { ImportData } from "./export.schema.js";

function parseJsonField(value: string | null): unknown {
  if (value === null) return null;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

export async function getFullExport(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: {
      settings: true,
      subjects: {
        include: {
          flashcardDecks: { include: { flashcards: true } },
        },
      },
      timeGridSlots: true,
      timetableSlots: true,
      calendarEvents: true,
      homework: { include: { subtasks: true } },
      generalNotes: true,
    },
  });

  const generalNotes = user.generalNotes.map((note) => ({
    ...note,
    contentJson: parseJsonField(note.contentJson),
  }));

  return {
    exportedAt: new Date().toISOString(),
    version: 2,
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      createdAt: user.createdAt,
    },
    settings: user.settings,
    subjects: user.subjects,
    timeGridSlots: user.timeGridSlots,
    timetableSlots: user.timetableSlots,
    calendarEvents: user.calendarEvents,
    homework: user.homework,
    generalNotes,
    // Goodnotes Hefte (the PDFs) and the links pointing into them aren't
    // exported: Goodnotes itself is the source of those and re-uploads
    // everything on its next backup.
  };
}

export interface ImportSummary {
  subjects: number;
  flashcardDecks: number;
  flashcards: number;
  timeGridSlots: number;
  timetableSlots: number;
  calendarEvents: number;
  homework: number;
  generalNotes: number;
}

/**
 * Imports data from a previous export as *additional* records for this
 * user — it never deletes or overwrites existing content (Settings is the
 * one exception, since there's only ever one row per user and re-applying
 * imported preferences is the expected behavior). Subjects are matched by
 * their unique natural key (name) and reused if found, so importing into an
 * account that already has data doesn't blow up on the unique constraint or
 * create obviously duplicate subjects; everything nested under them
 * (Karteikarten-Stapel etc.) is always created fresh. IDs from the import
 * file are only used internally to relink cross-references within the same
 * file (e.g. a homework item's subjectId) — every record gets a brand new ID
 * in this database.
 */
export async function importUserData(
  userId: string,
  payload: ImportData,
): Promise<ImportSummary> {
  const summary: ImportSummary = {
    subjects: 0,
    flashcardDecks: 0,
    flashcards: 0,
    timeGridSlots: 0,
    timetableSlots: 0,
    calendarEvents: 0,
    homework: 0,
    generalNotes: 0,
  };

  await prisma.$transaction(async (tx) => {
    const subjectIdMap = new Map<string, string>();

    for (const subject of payload.subjects) {
      let subjectRecord = await tx.subject.findFirst({
        where: { userId, name: subject.name },
      });
      if (!subjectRecord) {
        subjectRecord = await tx.subject.create({
          data: { userId, name: subject.name, color: subject.color },
        });
        summary.subjects++;
      }
      subjectIdMap.set(subject.id, subjectRecord.id);

      for (const deck of subject.flashcardDecks) {
        const deckRecord = await tx.flashcardDeck.create({
          data: {
            userId,
            subjectId: subjectRecord.id,
            name: deck.name,
            sortOrder: deck.sortOrder,
          },
        });
        summary.flashcardDecks++;

        for (const flashcard of deck.flashcards) {
          await tx.flashcard.create({
            data: {
              deckId: deckRecord.id,
              question: flashcard.question,
              answer: flashcard.answer,
              state: flashcard.state,
              sortOrder: flashcard.sortOrder,
            },
          });
          summary.flashcards++;
        }
      }
    }

    const timeGridIdMap = new Map<string, string>();
    for (const slot of payload.timeGridSlots) {
      const record = await tx.timeGridSlot.create({
        data: {
          userId,
          label: slot.label,
          type: slot.type,
          startTime: slot.startTime,
          endTime: slot.endTime,
          sortOrder: slot.sortOrder,
        },
      });
      timeGridIdMap.set(slot.id, record.id);
      summary.timeGridSlots++;
    }

    for (const slot of payload.timetableSlots) {
      const timeGridSlotId = timeGridIdMap.get(slot.timeGridSlotId);
      if (!timeGridSlotId) continue;
      const subjectId = slot.subjectId ? (subjectIdMap.get(slot.subjectId) ?? null) : null;
      await tx.timetableSlot.create({
        data: {
          userId,
          weekday: slot.weekday,
          timeGridSlotId,
          subjectId,
          room: slot.room ?? null,
          note: slot.note ?? null,
        },
      });
      summary.timetableSlots++;
    }

    for (const event of payload.calendarEvents) {
      const subjectId = event.subjectId ? (subjectIdMap.get(event.subjectId) ?? null) : null;
      const data = {
        userId,
        title: event.title,
        type: event.type,
        startDate: event.startDate,
        endDate: event.endDate ?? null,
        allDay: event.allDay,
        startTime: event.startTime ?? null,
        endTime: event.endTime ?? null,
        subjectId,
        color: event.color ?? null,
        note: event.note ?? null,
        externalRef: event.externalRef ?? null,
      };
      if (event.externalRef) {
        await tx.calendarEvent.upsert({
          where: { userId_externalRef: { userId, externalRef: event.externalRef } },
          create: data,
          update: data,
        });
      } else {
        await tx.calendarEvent.create({ data });
      }
      summary.calendarEvents++;
    }

    for (const hw of payload.homework) {
      const subjectId = hw.subjectId ? (subjectIdMap.get(hw.subjectId) ?? null) : null;
      const hwRecord = await tx.homework.create({
        data: {
          userId,
          title: hw.title,
          subjectId,
          dueDate: hw.dueDate ?? null,
          done: hw.done,
          note: hw.note ?? null,
        },
      });
      summary.homework++;

      for (const subtask of hw.subtasks) {
        await tx.homeworkSubtask.create({
          data: {
            homeworkId: hwRecord.id,
            title: subtask.title,
            done: subtask.done,
            sortOrder: subtask.sortOrder,
          },
        });
      }
    }

    for (const note of payload.generalNotes) {
      await tx.generalNote.create({
        data: {
          userId,
          title: note.title ?? null,
          contentJson: JSON.stringify(note.contentJson),
          sortOrder: note.sortOrder,
        },
      });
      summary.generalNotes++;
    }

    if (payload.settings) {
      await tx.settings.update({
        where: { userId },
        data: {
          currentGradeLevel: payload.settings.currentGradeLevel,
          currentSchoolYearLabel: payload.settings.currentSchoolYearLabel ?? null,
          federalState: payload.settings.federalState,
        },
      });
    }
  });

  return summary;
}
