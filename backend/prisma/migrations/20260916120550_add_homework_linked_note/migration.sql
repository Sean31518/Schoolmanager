-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Homework" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subjectId" TEXT,
    "dueDate" DATETIME,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "linkedNoteId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Homework_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Homework_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Homework_linkedNoteId_fkey" FOREIGN KEY ("linkedNoteId") REFERENCES "Note" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Homework" ("createdAt", "done", "dueDate", "id", "note", "subjectId", "title", "updatedAt", "userId") SELECT "createdAt", "done", "dueDate", "id", "note", "subjectId", "title", "updatedAt", "userId" FROM "Homework";
DROP TABLE "Homework";
ALTER TABLE "new_Homework" RENAME TO "Homework";
CREATE INDEX "Homework_userId_dueDate_idx" ON "Homework"("userId", "dueDate");
CREATE INDEX "Homework_linkedNoteId_idx" ON "Homework"("linkedNoteId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
