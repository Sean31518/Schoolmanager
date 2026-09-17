import { prisma } from "../../lib/prisma.js";
import type { ImportData } from "./export.schema.js";

const FILE_DEPENDENT_BLOCK_TYPES = new Set(["VIDEO", "IMAGE", "PDF_PAGE"]);

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
          noteSectionTypes: {
            include: {
              topics: {
                include: {
                  notes: { include: { blocks: true } },
                  gradeLevels: true,
                  flashcards: true,
                },
              },
            },
          },
        },
      },
      timeGridSlots: true,
      timetableSlots: true,
      calendarEvents: { include: { examPrepItems: true } },
      homework: { include: { subtasks: true } },
      generalNotes: true,
      uploadedFiles: true,
    },
  });

  const subjects = user.subjects.map((subject) => ({
    ...subject,
    noteSectionTypes: subject.noteSectionTypes.map((sectionType) => ({
      ...sectionType,
      topics: sectionType.topics.map((topic) => ({
        ...topic,
        notes: topic.notes.map((note) => ({
          ...note,
          blocks: note.blocks.map((block) => ({
            ...block,
            contentJson: parseJsonField(block.contentJson),
          })),
        })),
      })),
    })),
  }));

  const generalNotes = user.generalNotes.map((note) => ({
    ...note,
    contentJson: parseJsonField(note.contentJson),
  }));

  return {
    exportedAt: new Date().toISOString(),
    version: 1,
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      createdAt: user.createdAt,
    },
    settings: user.settings,
    subjects,
    timeGridSlots: user.timeGridSlots,
    timetableSlots: user.timetableSlots,
    calendarEvents: user.calendarEvents,
    homework: user.homework,
    generalNotes,
    // Binary contents of uploaded files (PDFs/images attached to notes)
    // live on disk, not in the database, and aren't included here — only
    // their metadata, so the export at least documents what's referenced.
    uploadedFiles: user.uploadedFiles.map((file) => ({
      id: file.id,
      originalName: file.originalName,
      mimeType: file.mimeType,
      size: file.size,
      createdAt: file.createdAt,
    })),
  };
}

export interface ImportSummary {
  subjects: number;
  noteSectionTypes: number;
  topics: number;
  notes: number;
  blocksSkipped: number;
  flashcards: number;
  timeGridSlots: number;
  timetableSlots: number;
  calendarEvents: number;
  examPrepItems: number;
  homework: number;
  generalNotes: number;
}

/**
 * Imports data from a previous export as *additional* records for this
 * user — it never deletes or overwrites existing content (Settings is the
 * one exception, since there's only ever one row per user and re-applying
 * imported preferences is the expected behavior). Subject and
 * NoteSectionType are matched by their unique natural key (name) and
 * reused if found, so importing into an account that already has data
 * doesn't blow up on the unique constraint or create obviously duplicate
 * top-level subjects; everything nested under them (topics/notes/etc.) is
 * always created fresh. IDs from the import file are only used internally
 * to relink cross-references within the same file (e.g. a homework item's
 * linkedNoteId) — every record gets a brand new ID in this database.
 */
export async function importUserData(
  userId: string,
  payload: ImportData,
): Promise<ImportSummary> {
  const summary: ImportSummary = {
    subjects: 0,
    noteSectionTypes: 0,
    topics: 0,
    notes: 0,
    blocksSkipped: 0,
    flashcards: 0,
    timeGridSlots: 0,
    timetableSlots: 0,
    calendarEvents: 0,
    examPrepItems: 0,
    homework: 0,
    generalNotes: 0,
  };

  await prisma.$transaction(async (tx) => {
    const subjectIdMap = new Map<string, string>();
    const noteIdMap = new Map<string, string>();

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

      for (const sectionType of subject.noteSectionTypes) {
        let sectionTypeRecord = await tx.noteSectionType.findFirst({
          where: { subjectId: subjectRecord.id, name: sectionType.name },
        });
        if (!sectionTypeRecord) {
          sectionTypeRecord = await tx.noteSectionType.create({
            data: {
              subjectId: subjectRecord.id,
              name: sectionType.name,
              sortOrder: sectionType.sortOrder,
            },
          });
          summary.noteSectionTypes++;
        }

        for (const topic of sectionType.topics) {
          const topicRecord = await tx.topic.create({
            data: {
              noteSectionTypeId: sectionTypeRecord.id,
              name: topic.name,
              sortOrder: topic.sortOrder,
            },
          });
          summary.topics++;

          for (const gradeLevel of topic.gradeLevels) {
            await tx.topicGradeLevel
              .create({ data: { topicId: topicRecord.id, gradeLevel: gradeLevel.gradeLevel } })
              .catch(() => undefined);
          }

          for (const flashcard of topic.flashcards) {
            await tx.flashcard.create({
              data: {
                topicId: topicRecord.id,
                question: flashcard.question,
                answer: flashcard.answer,
                state: flashcard.state,
                sortOrder: flashcard.sortOrder,
              },
            });
            summary.flashcards++;
          }

          for (const note of topic.notes) {
            const noteRecord = await tx.note.create({
              data: {
                topicId: topicRecord.id,
                title: note.title,
                sortOrder: note.sortOrder,
              },
            });
            summary.notes++;
            noteIdMap.set(note.id, noteRecord.id);

            for (const block of note.blocks) {
              if (FILE_DEPENDENT_BLOCK_TYPES.has(block.type)) {
                // The original file's bytes aren't part of the export, so a
                // restored block would point at a file that doesn't exist.
                summary.blocksSkipped++;
                continue;
              }
              await tx.noteBlock.create({
                data: {
                  noteId: noteRecord.id,
                  type: block.type,
                  sortOrder: block.sortOrder,
                  contentJson:
                    block.contentJson !== undefined && block.contentJson !== null
                      ? JSON.stringify(block.contentJson)
                      : null,
                  url: block.url ?? null,
                },
              });
            }
          }
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
        subjectId,
        color: event.color ?? null,
        note: event.note ?? null,
        externalRef: event.externalRef ?? null,
      };
      const eventRecord = event.externalRef
        ? await tx.calendarEvent.upsert({
            where: { userId_externalRef: { userId, externalRef: event.externalRef } },
            create: data,
            update: data,
          })
        : await tx.calendarEvent.create({ data });
      summary.calendarEvents++;

      for (const item of event.examPrepItems) {
        const noteId = noteIdMap.get(item.noteId);
        if (!noteId) continue;
        await tx.examPrepItem
          .create({
            data: {
              calendarEventId: eventRecord.id,
              noteId,
              sectionIndex: item.sectionIndex,
              sectionLabel: item.sectionLabel,
            },
          })
          .catch(() => undefined);
        summary.examPrepItems++;
      }
    }

    for (const hw of payload.homework) {
      const subjectId = hw.subjectId ? (subjectIdMap.get(hw.subjectId) ?? null) : null;
      const linkedNoteId = hw.linkedNoteId ? (noteIdMap.get(hw.linkedNoteId) ?? null) : null;
      const hwRecord = await tx.homework.create({
        data: {
          userId,
          title: hw.title,
          subjectId,
          dueDate: hw.dueDate ?? null,
          done: hw.done,
          note: hw.note ?? null,
          linkedNoteId,
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
