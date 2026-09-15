/*
  Warnings:

  - You are about to drop the column `gradeLevel` on the `Note` table. All the data in the column will be lost.
  - You are about to drop the column `noteSectionTypeId` on the `Note` table. All the data in the column will be lost.
  - Added the required column `title` to the `Note` table without a default value. This is not possible if the table is not empty.
  - Added the required column `topicId` to the `Note` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "Topic" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "noteSectionTypeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "gradeLevel" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Topic_noteSectionTypeId_fkey" FOREIGN KEY ("noteSectionTypeId") REFERENCES "NoteSectionType" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Note" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "topicId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "contentJson" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Note_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Note" ("contentJson", "createdAt", "id", "updatedAt") SELECT "contentJson", "createdAt", "id", "updatedAt" FROM "Note";
DROP TABLE "Note";
ALTER TABLE "new_Note" RENAME TO "Note";
CREATE INDEX "Note_topicId_idx" ON "Note"("topicId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Topic_noteSectionTypeId_idx" ON "Topic"("noteSectionTypeId");
