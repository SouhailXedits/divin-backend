-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Plan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "minDeposit" REAL NOT NULL,
    "maxDeposit" REAL NOT NULL,
    "maxAccounts" INTEGER NOT NULL,
    "profitSharingCustomer" INTEGER NOT NULL,
    "profitSharingPlatform" INTEGER NOT NULL,
    "upfrontFee" REAL NOT NULL,
    "visability" TEXT NOT NULL DEFAULT 'PUBLIC',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Plan" ("createdAt", "id", "maxAccounts", "maxDeposit", "minDeposit", "name", "profitSharingCustomer", "profitSharingPlatform", "updatedAt", "upfrontFee") SELECT "createdAt", "id", "maxAccounts", "maxDeposit", "minDeposit", "name", "profitSharingCustomer", "profitSharingPlatform", "updatedAt", "upfrontFee" FROM "Plan";
DROP TABLE "Plan";
ALTER TABLE "new_Plan" RENAME TO "Plan";
CREATE UNIQUE INDEX "Plan_name_key" ON "Plan"("name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
