-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_staff" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "permissions" TEXT NOT NULL,
    "portalName" TEXT NOT NULL DEFAULT 'Default Portal',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_login" DATETIME,
    "updated_at" DATETIME NOT NULL
);
INSERT INTO "new_staff" ("created_at", "email", "id", "last_login", "name", "permissions", "role", "status", "updated_at") SELECT "created_at", "email", "id", "last_login", "name", "permissions", "role", "status", "updated_at" FROM "staff";
DROP TABLE "staff";
ALTER TABLE "new_staff" RENAME TO "staff";
CREATE UNIQUE INDEX "staff_id_key" ON "staff"("id");
CREATE UNIQUE INDEX "staff_email_key" ON "staff"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
