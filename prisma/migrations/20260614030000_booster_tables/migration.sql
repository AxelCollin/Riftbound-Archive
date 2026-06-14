-- CreateTable
CREATE TABLE "BoosterSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "boostersPerInterval" INTEGER NOT NULL DEFAULT 1,
    "intervalCount" INTEGER NOT NULL DEFAULT 1,
    "intervalUnit" TEXT NOT NULL DEFAULT 'DAY',
    "accrualAnchorAt" DATETIME NOT NULL,
    "autoDecrementOnOpening" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "BoosterOpening" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "openedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "boosterCount" INTEGER NOT NULL DEFAULT 1,
    "decrementCounter" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'RECORDED',
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "BoosterCounterEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "quantityDelta" INTEGER NOT NULL,
    "occurredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    "boosterOpeningId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BoosterCounterEvent_boosterOpeningId_fkey" FOREIGN KEY ("boosterOpeningId") REFERENCES "BoosterOpening" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BoosterOpeningCard" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "boosterOpeningId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "variant" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BoosterOpeningCard_boosterOpeningId_fkey" FOREIGN KEY ("boosterOpeningId") REFERENCES "BoosterOpening" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BoosterOpeningCard_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "BoosterSettings_intervalUnit_idx" ON "BoosterSettings"("intervalUnit");

-- CreateIndex
CREATE INDEX "BoosterOpening_openedAt_idx" ON "BoosterOpening"("openedAt");

-- CreateIndex
CREATE INDEX "BoosterOpening_status_idx" ON "BoosterOpening"("status");

-- CreateIndex
CREATE INDEX "BoosterOpening_decrementCounter_idx" ON "BoosterOpening"("decrementCounter");

-- CreateIndex
CREATE INDEX "BoosterCounterEvent_type_idx" ON "BoosterCounterEvent"("type");

-- CreateIndex
CREATE INDEX "BoosterCounterEvent_occurredAt_idx" ON "BoosterCounterEvent"("occurredAt");

-- CreateIndex
CREATE INDEX "BoosterCounterEvent_boosterOpeningId_idx" ON "BoosterCounterEvent"("boosterOpeningId");

-- CreateIndex
CREATE INDEX "BoosterOpeningCard_boosterOpeningId_idx" ON "BoosterOpeningCard"("boosterOpeningId");

-- CreateIndex
CREATE INDEX "BoosterOpeningCard_cardId_idx" ON "BoosterOpeningCard"("cardId");

-- CreateIndex
CREATE INDEX "BoosterOpeningCard_variant_idx" ON "BoosterOpeningCard"("variant");

-- CreateIndex
CREATE UNIQUE INDEX "BoosterOpeningCard_boosterOpeningId_cardId_variant_key" ON "BoosterOpeningCard"("boosterOpeningId", "cardId", "variant");
