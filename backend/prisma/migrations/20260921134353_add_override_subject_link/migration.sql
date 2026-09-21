-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_TimetableOverride" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "timeGridSlotId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "subjectName" TEXT,
    "subjectId" TEXT,
    "rawSubjectCode" TEXT,
    "room" TEXT,
    "startTime" TEXT,
    "endTime" TEXT,
    "teacherName" TEXT,
    "teacherAcronym" TEXT,
    "courseName" TEXT,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TimetableOverride_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TimetableOverride_timeGridSlotId_fkey" FOREIGN KEY ("timeGridSlotId") REFERENCES "TimeGridSlot" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TimetableOverride_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_TimetableOverride" ("courseName", "createdAt", "date", "endTime", "id", "note", "room", "startTime", "subjectName", "teacherAcronym", "teacherName", "timeGridSlotId", "type", "updatedAt", "userId") SELECT "courseName", "createdAt", "date", "endTime", "id", "note", "room", "startTime", "subjectName", "teacherAcronym", "teacherName", "timeGridSlotId", "type", "updatedAt", "userId" FROM "TimetableOverride";
DROP TABLE "TimetableOverride";
ALTER TABLE "new_TimetableOverride" RENAME TO "TimetableOverride";
CREATE INDEX "TimetableOverride_userId_date_idx" ON "TimetableOverride"("userId", "date");
CREATE UNIQUE INDEX "TimetableOverride_userId_date_timeGridSlotId_key" ON "TimetableOverride"("userId", "date", "timeGridSlotId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
