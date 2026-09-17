import { z } from "zod";

const jsonValue = z.unknown();

const noteBlockImportSchema = z.object({
  type: z.enum(["TEXT", "LINK", "VIDEO", "IMAGE", "PDF_PAGE"]),
  sortOrder: z.number().default(0),
  contentJson: jsonValue.nullable().optional(),
  url: z.string().nullable().optional(),
});

const noteImportSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  sortOrder: z.number().default(0),
  blocks: z.array(noteBlockImportSchema).default([]),
});

const flashcardImportSchema = z.object({
  question: z.string().min(1),
  answer: z.string().min(1),
  state: z.string().default("NEW"),
  sortOrder: z.number().default(0),
});

const gradeLevelImportSchema = z.object({
  gradeLevel: z.number(),
});

const topicImportSchema = z.object({
  name: z.string().min(1),
  sortOrder: z.number().default(0),
  notes: z.array(noteImportSchema).default([]),
  gradeLevels: z.array(gradeLevelImportSchema).default([]),
  flashcards: z.array(flashcardImportSchema).default([]),
});

const sectionTypeImportSchema = z.object({
  name: z.string().min(1),
  sortOrder: z.number().default(0),
  topics: z.array(topicImportSchema).default([]),
});

const subjectImportSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  color: z.string(),
  noteSectionTypes: z.array(sectionTypeImportSchema).default([]),
});

const timeGridSlotImportSchema = z.object({
  id: z.string(),
  label: z.string(),
  type: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  sortOrder: z.number().default(0),
});

const timetableSlotImportSchema = z.object({
  weekday: z.string(),
  timeGridSlotId: z.string(),
  subjectId: z.string().nullable().optional(),
  room: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
});

const examPrepItemImportSchema = z.object({
  noteId: z.string(),
  sectionIndex: z.number(),
  sectionLabel: z.string(),
});

const calendarEventImportSchema = z.object({
  title: z.string().min(1),
  type: z.string().default("MANUAL"),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().nullable().optional(),
  allDay: z.boolean().default(true),
  subjectId: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
  externalRef: z.string().nullable().optional(),
  examPrepItems: z.array(examPrepItemImportSchema).default([]),
});

const homeworkSubtaskImportSchema = z.object({
  title: z.string().min(1),
  done: z.boolean().default(false),
  sortOrder: z.number().default(0),
});

const homeworkImportSchema = z.object({
  title: z.string().min(1),
  subjectId: z.string().nullable().optional(),
  dueDate: z.coerce.date().nullable().optional(),
  done: z.boolean().default(false),
  note: z.string().nullable().optional(),
  linkedNoteId: z.string().nullable().optional(),
  subtasks: z.array(homeworkSubtaskImportSchema).default([]),
});

const generalNoteImportSchema = z.object({
  title: z.string().nullable().optional(),
  contentJson: jsonValue,
  sortOrder: z.number().default(0),
});

const settingsImportSchema = z.object({
  currentGradeLevel: z.number(),
  currentSchoolYearLabel: z.string().nullable().optional(),
  federalState: z.string(),
});

export const importDataSchema = z.object({
  version: z.number(),
  subjects: z.array(subjectImportSchema).default([]),
  timeGridSlots: z.array(timeGridSlotImportSchema).default([]),
  timetableSlots: z.array(timetableSlotImportSchema).default([]),
  calendarEvents: z.array(calendarEventImportSchema).default([]),
  homework: z.array(homeworkImportSchema).default([]),
  generalNotes: z.array(generalNoteImportSchema).default([]),
  settings: settingsImportSchema.nullable().optional(),
});

export type ImportData = z.infer<typeof importDataSchema>;
