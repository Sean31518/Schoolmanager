-- CreateTable
CREATE TABLE "ExamPrepItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "calendarEventId" TEXT NOT NULL,
    "noteId" TEXT NOT NULL,
    "sectionIndex" INTEGER NOT NULL,
    "sectionLabel" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExamPrepItem_calendarEventId_fkey" FOREIGN KEY ("calendarEventId") REFERENCES "CalendarEvent" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ExamPrepItem_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "Note" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ExamPrepItem_calendarEventId_idx" ON "ExamPrepItem"("calendarEventId");

-- CreateIndex
CREATE INDEX "ExamPrepItem_noteId_idx" ON "ExamPrepItem"("noteId");

-- CreateIndex
CREATE UNIQUE INDEX "ExamPrepItem_calendarEventId_noteId_sectionIndex_key" ON "ExamPrepItem"("calendarEventId", "noteId", "sectionIndex");
