/*
  Warnings:

  - You are about to drop the `UserPnL` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "UserPnL";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "userPnL" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "pnlId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "userPnL_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "userPnL_pnlId_fkey" FOREIGN KEY ("pnlId") REFERENCES "PnL" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "userPnL_userId_pnlId_key" ON "userPnL"("userId", "pnlId");
