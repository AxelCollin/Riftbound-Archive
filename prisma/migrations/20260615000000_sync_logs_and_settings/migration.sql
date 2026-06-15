-- CreateTable
CREATE TABLE "SyncSetting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "target" TEXT NOT NULL,
    "providerKey" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "intervalMinutes" INTEGER,
    "localeChain" TEXT,
    "configJson" JSONB,
    "lastRunAt" DATETIME,
    "lastSuccessAt" DATETIME,
    "lastFailureAt" DATETIME,
    "lastStatus" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SyncLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "target" TEXT NOT NULL,
    "providerKey" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "trigger" TEXT,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    "message" TEXT,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "itemsScanned" INTEGER,
    "itemsCreated" INTEGER,
    "itemsUpdated" INTEGER,
    "itemsSkipped" INTEGER,
    "rawJson" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "SyncSetting_target_idx" ON "SyncSetting"("target");

-- CreateIndex
CREATE INDEX "SyncSetting_providerKey_idx" ON "SyncSetting"("providerKey");

-- CreateIndex
CREATE INDEX "SyncSetting_enabled_idx" ON "SyncSetting"("enabled");

-- CreateIndex
CREATE INDEX "SyncSetting_lastRunAt_idx" ON "SyncSetting"("lastRunAt");

-- CreateIndex
CREATE INDEX "SyncSetting_lastStatus_idx" ON "SyncSetting"("lastStatus");

-- CreateIndex
CREATE UNIQUE INDEX "SyncSetting_target_providerKey_key" ON "SyncSetting"("target", "providerKey");

-- CreateIndex
CREATE INDEX "SyncLog_target_idx" ON "SyncLog"("target");

-- CreateIndex
CREATE INDEX "SyncLog_providerKey_idx" ON "SyncLog"("providerKey");

-- CreateIndex
CREATE INDEX "SyncLog_status_idx" ON "SyncLog"("status");

-- CreateIndex
CREATE INDEX "SyncLog_trigger_idx" ON "SyncLog"("trigger");

-- CreateIndex
CREATE INDEX "SyncLog_startedAt_idx" ON "SyncLog"("startedAt");

-- CreateIndex
CREATE INDEX "SyncLog_completedAt_idx" ON "SyncLog"("completedAt");
