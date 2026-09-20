-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
    CONSTRAINT "Settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Settings" ("createdAt", "currentGradeLevel", "currentSchoolYearLabel", "federalState", "id", "iservClass", "iservHost", "iservLastSyncAt", "iservLastSyncError", "iservPasswordEncrypted", "iservUsername", "updatedAt", "userId") SELECT "createdAt", "currentGradeLevel", "currentSchoolYearLabel", "federalState", "id", "iservClass", "iservHost", "iservLastSyncAt", "iservLastSyncError", "iservPasswordEncrypted", "iservUsername", "updatedAt", "userId" FROM "Settings";
DROP TABLE "Settings";
ALTER TABLE "new_Settings" RENAME TO "Settings";
CREATE UNIQUE INDEX "Settings_userId_key" ON "Settings"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
