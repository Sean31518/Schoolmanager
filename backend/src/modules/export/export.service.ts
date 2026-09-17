import { prisma } from "../../lib/prisma.js";

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
