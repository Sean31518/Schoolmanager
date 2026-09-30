-- DropIndex
DROP INDEX "ExamPrepItem_calendarEventId_noteId_sectionIndex_key";

-- DropIndex
DROP INDEX "ExamPrepItem_noteId_idx";

-- DropIndex
DROP INDEX "ExamPrepItem_calendarEventId_idx";

-- DropIndex
DROP INDEX "Note_topicId_idx";

-- DropIndex
DROP INDEX "NoteBlock_fileId_idx";

-- DropIndex
DROP INDEX "NoteBlock_noteId_idx";

-- DropIndex
DROP INDEX "NoteSectionType_subjectId_name_key";

-- DropIndex
DROP INDEX "NoteSectionType_subjectId_idx";

-- DropIndex
DROP INDEX "Topic_noteSectionTypeId_idx";

-- DropIndex
DROP INDEX "TopicGradeLevel_topicId_gradeLevel_key";

-- DropIndex
DROP INDEX "TopicGradeLevel_topicId_idx";

-- DropIndex
DROP INDEX "UploadedFile_userId_idx";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "ExamPrepItem";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Note";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "NoteBlock";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "NoteSectionType";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Topic";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "TopicGradeLevel";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "UploadedFile";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "AppPassword" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "lastUsedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AppPassword_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DavFolder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "subjectId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DavFolder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DavFolder_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DavFile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "sha256" TEXT,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "modifiedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DavFile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DavFileVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fileId" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "pageCount" INTEGER NOT NULL,
    "pageFingerprints" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DavFileVersion_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "DavFile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DocumentLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "pageStart" INTEGER,
    "pageEnd" INTEGER,
    "fingerprintStart" TEXT,
    "fingerprintEnd" TEXT,
    "uncertain" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "homeworkId" TEXT,
    "calendarEventId" TEXT,
    "flashcardId" TEXT,
    "generalNoteId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DocumentLink_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DocumentLink_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "DavFile" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DocumentLink_homeworkId_fkey" FOREIGN KEY ("homeworkId") REFERENCES "Homework" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DocumentLink_calendarEventId_fkey" FOREIGN KEY ("calendarEventId") REFERENCES "CalendarEvent" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DocumentLink_flashcardId_fkey" FOREIGN KEY ("flashcardId") REFERENCES "Flashcard" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DocumentLink_generalNoteId_fkey" FOREIGN KEY ("generalNoteId") REFERENCES "GeneralNote" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FlashcardDeck" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FlashcardDeck_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FlashcardDeck_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Flashcard" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "deckId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'NEW',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "lastReviewedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Flashcard_deckId_fkey" FOREIGN KEY ("deckId") REFERENCES "FlashcardDeck" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
-- Old topic-based flashcards are dropped on purpose (Goodnotes pivot: no data migration).
DROP TABLE "Flashcard";
ALTER TABLE "new_Flashcard" RENAME TO "Flashcard";
CREATE INDEX "Flashcard_deckId_idx" ON "Flashcard"("deckId");
CREATE TABLE "new_Homework" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subjectId" TEXT,
    "dueDate" DATETIME,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Homework_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Homework_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Homework" ("createdAt", "done", "dueDate", "id", "note", "subjectId", "title", "updatedAt", "userId") SELECT "createdAt", "done", "dueDate", "id", "note", "subjectId", "title", "updatedAt", "userId" FROM "Homework";
DROP TABLE "Homework";
ALTER TABLE "new_Homework" RENAME TO "Homework";
CREATE INDEX "Homework_userId_dueDate_idx" ON "Homework"("userId", "dueDate");
CREATE TABLE "new_Settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "currentGradeLevel" INTEGER NOT NULL DEFAULT 5,
    "currentSchoolYearLabel" TEXT,
    "federalState" TEXT NOT NULL DEFAULT 'BW',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "iservHost" TEXT,
    "iservUsername" TEXT,
    "iservPasswordEncrypted" TEXT,
    "iservClass" TEXT,
    "iservActive" BOOLEAN NOT NULL DEFAULT false,
    "iservLastSyncAt" DATETIME,
    "iservLastSyncError" TEXT,
    "davVersionsToKeep" INTEGER NOT NULL DEFAULT 3,
    CONSTRAINT "Settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Settings" ("createdAt", "currentGradeLevel", "currentSchoolYearLabel", "federalState", "id", "iservActive", "iservClass", "iservHost", "iservLastSyncAt", "iservLastSyncError", "iservPasswordEncrypted", "iservUsername", "updatedAt", "userId") SELECT "createdAt", "currentGradeLevel", "currentSchoolYearLabel", "federalState", "id", "iservActive", "iservClass", "iservHost", "iservLastSyncAt", "iservLastSyncError", "iservPasswordEncrypted", "iservUsername", "updatedAt", "userId" FROM "Settings";
DROP TABLE "Settings";
ALTER TABLE "new_Settings" RENAME TO "Settings";
CREATE UNIQUE INDEX "Settings_userId_key" ON "Settings"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "AppPassword_tokenHash_key" ON "AppPassword"("tokenHash");

-- CreateIndex
CREATE INDEX "AppPassword_userId_idx" ON "AppPassword"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DavFolder_userId_path_key" ON "DavFolder"("userId", "path");

-- CreateIndex
CREATE INDEX "DavFile_userId_idx" ON "DavFile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DavFile_userId_path_key" ON "DavFile"("userId", "path");

-- CreateIndex
CREATE INDEX "DavFileVersion_fileId_idx" ON "DavFileVersion"("fileId");

-- CreateIndex
CREATE INDEX "DocumentLink_userId_idx" ON "DocumentLink"("userId");

-- CreateIndex
CREATE INDEX "DocumentLink_fileId_idx" ON "DocumentLink"("fileId");

-- CreateIndex
CREATE INDEX "DocumentLink_homeworkId_idx" ON "DocumentLink"("homeworkId");

-- CreateIndex
CREATE INDEX "DocumentLink_calendarEventId_idx" ON "DocumentLink"("calendarEventId");

-- CreateIndex
CREATE INDEX "DocumentLink_flashcardId_idx" ON "DocumentLink"("flashcardId");

-- CreateIndex
CREATE INDEX "DocumentLink_generalNoteId_idx" ON "DocumentLink"("generalNoteId");

-- CreateIndex
CREATE INDEX "FlashcardDeck_userId_idx" ON "FlashcardDeck"("userId");

-- CreateIndex
CREATE INDEX "FlashcardDeck_subjectId_idx" ON "FlashcardDeck"("subjectId");

