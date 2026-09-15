import path from "node:path";
import { fileURLToPath } from "node:url";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { ensureUploadsDir } from "./lib/storage.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { calendarEventsRouter } from "./modules/calendarEvents/calendarEvents.routes.js";
import { dashboardRouter } from "./modules/dashboard/dashboard.routes.js";
import { examPrepRouter } from "./modules/examPrep/examPrep.routes.js";
import { filesRouter } from "./modules/files/files.routes.js";
import { flashcardByIdRouter, flashcardsRouter } from "./modules/flashcards/flashcards.routes.js";
import { generalNotesRouter } from "./modules/generalNotes/generalNotes.routes.js";
import { healthRouter } from "./modules/health/health.routes.js";
import { homeworkRouter } from "./modules/homework/homework.routes.js";
import { blockByIdRouter, noteBlocksRouter } from "./modules/noteBlocks/noteBlocks.routes.js";
import { sectionTypeByIdRouter } from "./modules/noteSectionTypes/noteSectionTypes.routes.js";
import { noteByIdRouter, notesRouter } from "./modules/notes/notes.routes.js";
import { settingsRouter } from "./modules/settings/settings.routes.js";
import { subjectsRouter } from "./modules/subjects/subjects.routes.js";
import { timeGridRouter } from "./modules/timeGrid/timeGrid.routes.js";
import { timetableRouter } from "./modules/timetable/timetable.routes.js";
import { topicByIdRouter, topicsRouter } from "./modules/topics/topics.routes.js";
import { uploadsRouter } from "./modules/uploads/uploads.routes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "..", "public");

export function createApp() {
  ensureUploadsDir();
  const app = express();

  app.use(cors({ credentials: true }));
  app.use(express.json());
  app.use(cookieParser());

  app.use("/api/health", healthRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/settings", settingsRouter);
  app.use("/api/subjects", subjectsRouter);
  app.use("/api/section-types/:sectionTypeId/topics", topicsRouter);
  app.use("/api/section-types", sectionTypeByIdRouter);
  app.use("/api/topics/:topicId/notes", notesRouter);
  app.use("/api/topics/:topicId/flashcards", flashcardsRouter);
  app.use("/api/flashcards", flashcardByIdRouter);
  app.use("/api/topics", topicByIdRouter);
  app.use("/api/notes/:noteId/blocks", noteBlocksRouter);
  app.use("/api/notes", noteByIdRouter);
  app.use("/api/blocks", blockByIdRouter);
  app.use("/api/uploads", uploadsRouter);
  app.use("/api/files", filesRouter);
  app.use("/api/time-grid", timeGridRouter);
  app.use("/api/timetable", timetableRouter);
  app.use("/api/homework", homeworkRouter);
  app.use("/api/general-notes", generalNotesRouter);
  app.use("/api/dashboard", dashboardRouter);
  app.use("/api/calendar-events/:eventId/exam-prep", examPrepRouter);
  app.use("/api/calendar-events", calendarEventsRouter);

  app.use(express.static(publicDir));
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(publicDir, "index.html"), (err) => {
      if (err) res.status(404).send("Not found");
    });
  });

  app.use(errorHandler);

  return app;
}
