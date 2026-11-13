-- CreateTable
CREATE TABLE "NewsletterSyncJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "subscriberId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedUntil" DATETIME,
    "lastError" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSyncJob_subscriberId_key" ON "NewsletterSyncJob"("subscriberId");

-- CreateIndex
CREATE INDEX "NewsletterSyncJob_status_nextAttemptAt_idx" ON "NewsletterSyncJob"("status", "nextAttemptAt");
