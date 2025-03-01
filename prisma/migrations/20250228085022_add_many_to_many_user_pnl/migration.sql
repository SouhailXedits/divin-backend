/*
  Warnings:

  - You are about to drop the column `userId` on the `PnL` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "UserPnL" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "pnlId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserPnL_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "UserPnL_pnlId_fkey" FOREIGN KEY ("pnlId") REFERENCES "PnL" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PnL" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "symbol" TEXT NOT NULL,
    "totalPnL" REAL NOT NULL,
    "customerShare" REAL NOT NULL,
    "divineAlgoShare" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_PnL" ("createdAt", "customerShare", "date", "divineAlgoShare", "id", "symbol", "totalPnL", "updatedAt") SELECT "createdAt", "customerShare", "date", "divineAlgoShare", "id", "symbol", "totalPnL", "updatedAt" FROM "PnL";
DROP TABLE "PnL";
ALTER TABLE "new_PnL" RENAME TO "PnL";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "UserPnL_userId_pnlId_key" ON "UserPnL"("userId", "pnlId");
