/*
  Warnings:

  - A unique constraint covering the columns `[id]` on the table `Transaction` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Plan" ADD COLUMN "confirmationText" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PnL" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
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
CREATE UNIQUE INDEX "Transaction_id_key" ON "Transaction"("id");
