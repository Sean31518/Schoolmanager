-- AlterTable
ALTER TABLE "Settings" ADD COLUMN "iservClass" TEXT;
ALTER TABLE "Settings" ADD COLUMN "iservHost" TEXT;
ALTER TABLE "Settings" ADD COLUMN "iservLastSyncAt" DATETIME;
ALTER TABLE "Settings" ADD COLUMN "iservLastSyncError" TEXT;
ALTER TABLE "Settings" ADD COLUMN "iservPasswordEncrypted" TEXT;
ALTER TABLE "Settings" ADD COLUMN "iservUsername" TEXT;

-- CreateTable
CREATE TABLE "TimetableOverride" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "timeGridSlotId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "subjectName" TEXT,
    "room" TEXT,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TimetableOverride_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TimetableOverride_timeGridSlotId_fkey" FOREIGN KEY ("timeGridSlotId") REFERENCES "TimeGridSlot" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "TimetableOverride_userId_date_idx" ON "TimetableOverride"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "TimetableOverride_userId_date_timeGridSlotId_key" ON "TimetableOverride"("userId", "date", "timeGridSlotId");
