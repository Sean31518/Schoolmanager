import path from "node:path";
import { fileURLToPath } from "node:url";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { ensureUploadsDir } from "./lib/storage.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { adminRouter } from "./modules/admin/admin.routes.js";
import { appPasswordsRouter } from "./modules/appPasswords/appPasswords.routes.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { calendarEventsRouter } from "./modules/calendarEvents/calendarEvents.routes.js";
import { dashboardRouter } from "./modules/dashboard/dashboard.routes.js";
import { exportRouter } from "./modules/export/export.routes.js";
import { importRouter } from "./modules/export/import.routes.js";
import { generalNotesRouter } from "./modules/generalNotes/generalNotes.routes.js";
import { healthRouter } from "./modules/health/health.routes.js";
import { homeworkRouter } from "./modules/homework/homework.routes.js";
import { pushRouter } from "./modules/push/push.routes.js";
import { searchRouter } from "./modules/search/search.routes.js";
import { settingsRouter } from "./modules/settings/settings.routes.js";
import { subjectsRouter } from "./modules/subjects/subjects.routes.js";
import { timeGridRouter } from "./modules/timeGrid/timeGrid.routes.js";
import { timetableRouter } from "./modules/timetable/timetable.routes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "..", "public");

export function createApp() {
  ensureUploadsDir();
  const app = express();

  app.use(cors({ credentials: true }));
  // Default 100kb is too small for a full-account data import.
  app.use(express.json({ limit: "15mb" }));
  app.use(cookieParser());

  app.use("/api/health", healthRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/admin", adminRouter);
  app.use("/api/settings", settingsRouter);
  app.use("/api/app-passwords", appPasswordsRouter);
  app.use("/api/subjects", subjectsRouter);
  app.use("/api/time-grid", timeGridRouter);
  app.use("/api/timetable", timetableRouter);
  app.use("/api/homework", homeworkRouter);
  app.use("/api/general-notes", generalNotesRouter);
  app.use("/api/dashboard", dashboardRouter);
  app.use("/api/export", exportRouter);
  app.use("/api/import", importRouter);
  app.use("/api/push", pushRouter);
  app.use("/api/search", searchRouter);
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
