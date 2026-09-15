/*
  Warnings:

  - You are about to drop the column `gradeLevel` on the `Topic` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "TopicGradeLevel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "topicId" TEXT NOT NULL,
    "gradeLevel" INTEGER NOT NULL,
    CONSTRAINT "TopicGradeLevel_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Migrate existing single-value gradeLevel data into the new join table
INSERT INTO "TopicGradeLevel" ("id", "topicId", "gradeLevel")
SELECT lower(hex(randomblob(16))), "id", "gradeLevel" FROM "Topic" WHERE "gradeLevel" IS NOT NULL;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Topic" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "noteSectionTypeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Topic_noteSectionTypeId_fkey" FOREIGN KEY ("noteSectionTypeId") REFERENCES "NoteSectionType" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Topic" ("createdAt", "id", "name", "noteSectionTypeId", "sortOrder", "updatedAt") SELECT "createdAt", "id", "name", "noteSectionTypeId", "sortOrder", "updatedAt" FROM "Topic";
DROP TABLE "Topic";
ALTER TABLE "new_Topic" RENAME TO "Topic";
CREATE INDEX "Topic_noteSectionTypeId_idx" ON "Topic"("noteSectionTypeId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "TopicGradeLevel_topicId_idx" ON "TopicGradeLevel"("topicId");

-- CreateIndex
CREATE UNIQUE INDEX "TopicGradeLevel_topicId_gradeLevel_key" ON "TopicGradeLevel"("topicId", "gradeLevel");
