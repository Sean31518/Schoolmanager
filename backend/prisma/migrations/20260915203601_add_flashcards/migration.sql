-- CreateTable
CREATE TABLE "Flashcard" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "topicId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'NEW',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "lastReviewedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Flashcard_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Flashcard_topicId_idx" ON "Flashcard"("topicId");
