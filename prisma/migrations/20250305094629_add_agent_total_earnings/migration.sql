/*
  Warnings:

  - You are about to drop the `userPnL` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropIndex
DROP INDEX "userPnL_userId_pnlId_key";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "userPnL";
PRAGMA foreign_keys=on;

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
CREATE TABLE "new_Referral" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agentId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "signupDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isManualAssignment" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "agentTotalEarnings" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Referral_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Referral_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Referral" ("agentId", "createdAt", "customerId", "id", "isActive", "isManualAssignment", "signupDate", "updatedAt") SELECT "agentId", "createdAt", "customerId", "id", "isActive", "isManualAssignment", "signupDate", "updatedAt" FROM "Referral";
DROP TABLE "Referral";
ALTER TABLE "new_Referral" RENAME TO "Referral";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "UserPnL_userId_pnlId_key" ON "UserPnL"("userId", "pnlId");
