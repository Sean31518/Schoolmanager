-- Renamed from 20260930235118_dav_version_processing, which sorted before
-- the pivot migration that creates DavFileVersion and so failed on a fresh
-- deploy. A failed earlier attempt may have left new_DavFileVersion behind.
DROP TABLE IF EXISTS "new_DavFileVersion";

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_DavFileVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fileId" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "pageCount" INTEGER NOT NULL DEFAULT 0,
    "pageFingerprints" TEXT NOT NULL DEFAULT '[]',
    "processedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DavFileVersion_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "DavFile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_DavFileVersion" ("createdAt", "fileId", "id", "pageCount", "pageFingerprints", "sha256", "size", "storagePath") SELECT "createdAt", "fileId", "id", "pageCount", "pageFingerprints", "sha256", "size", "storagePath" FROM "DavFileVersion";
DROP TABLE "DavFileVersion";
ALTER TABLE "new_DavFileVersion" RENAME TO "DavFileVersion";
CREATE INDEX "DavFileVersion_fileId_idx" ON "DavFileVersion"("fileId");
CREATE INDEX "DavFileVersion_processedAt_idx" ON "DavFileVersion"("processedAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
