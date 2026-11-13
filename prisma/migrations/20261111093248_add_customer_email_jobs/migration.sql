-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_EmailJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "idempotencyKey" TEXT NOT NULL,
    "orderId" TEXT,
    "customerId" TEXT,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedUntil" DATETIME,
    "sentAt" DATETIME,
    "lastError" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_EmailJob" ("attempts", "createdAt", "id", "idempotencyKey", "lastError", "lockedUntil", "nextAttemptAt", "orderId", "sentAt", "status", "type", "updatedAt") SELECT "attempts", "createdAt", "id", "idempotencyKey", "lastError", "lockedUntil", "nextAttemptAt", "orderId", "sentAt", "status", "type", "updatedAt" FROM "EmailJob";
DROP TABLE "EmailJob";
ALTER TABLE "new_EmailJob" RENAME TO "EmailJob";
CREATE UNIQUE INDEX "EmailJob_idempotencyKey_key" ON "EmailJob"("idempotencyKey");
CREATE INDEX "EmailJob_status_nextAttemptAt_idx" ON "EmailJob"("status", "nextAttemptAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
