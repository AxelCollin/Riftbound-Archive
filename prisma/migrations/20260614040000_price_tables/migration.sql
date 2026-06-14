-- CreateTable
CREATE TABLE "PriceProvider" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kind" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "priority" INTEGER NOT NULL DEFAULT 100,
    "baseUrl" TEXT,
    "configJson" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PriceMapping" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "providerId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "variant" TEXT NOT NULL,
    "externalId" TEXT,
    "externalVariantId" TEXT NOT NULL DEFAULT 'DEFAULT',
    "externalVariantLabel" TEXT,
    "status" TEXT NOT NULL DEFAULT 'CONFIRMED',
    "confidence" INTEGER,
    "matchSource" TEXT,
    "externalUrl" TEXT,
    "rawJson" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PriceMapping_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "PriceProvider" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PriceMapping_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CardPrice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "providerId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "variant" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'MARKET',
    "amountMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "fetchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sourceUrl" TEXT,
    "rawJson" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CardPrice_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "PriceProvider" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CardPrice_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ManualPriceOverride" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cardId" TEXT NOT NULL,
    "variant" TEXT NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ManualPriceOverride_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "PriceProvider_kind_idx" ON "PriceProvider"("kind");

-- CreateIndex
CREATE INDEX "PriceProvider_status_idx" ON "PriceProvider"("status");

-- CreateIndex
CREATE INDEX "PriceProvider_priority_idx" ON "PriceProvider"("priority");

-- CreateIndex
CREATE UNIQUE INDEX "PriceProvider_kind_name_key" ON "PriceProvider"("kind", "name");

-- CreateIndex
CREATE INDEX "PriceMapping_cardId_idx" ON "PriceMapping"("cardId");

-- CreateIndex
CREATE INDEX "PriceMapping_variant_idx" ON "PriceMapping"("variant");

-- CreateIndex
CREATE INDEX "PriceMapping_status_idx" ON "PriceMapping"("status");

-- CreateIndex
CREATE INDEX "PriceMapping_confidence_idx" ON "PriceMapping"("confidence");

-- CreateIndex
CREATE UNIQUE INDEX "PriceMapping_providerId_cardId_variant_key" ON "PriceMapping"("providerId", "cardId", "variant");

-- CreateIndex
CREATE INDEX "PriceMapping_externalVariantId_idx" ON "PriceMapping"("externalVariantId");

-- CreateIndex
CREATE UNIQUE INDEX "PriceMapping_providerId_externalId_externalVariantId_key" ON "PriceMapping"("providerId", "externalId", "externalVariantId");

-- CreateIndex
CREATE INDEX "CardPrice_providerId_idx" ON "CardPrice"("providerId");

-- CreateIndex
CREATE INDEX "CardPrice_cardId_idx" ON "CardPrice"("cardId");

-- CreateIndex
CREATE INDEX "CardPrice_variant_idx" ON "CardPrice"("variant");

-- CreateIndex
CREATE INDEX "CardPrice_type_idx" ON "CardPrice"("type");

-- CreateIndex
CREATE INDEX "CardPrice_currency_idx" ON "CardPrice"("currency");

-- CreateIndex
CREATE INDEX "CardPrice_fetchedAt_idx" ON "CardPrice"("fetchedAt");

-- CreateIndex
CREATE INDEX "ManualPriceOverride_cardId_idx" ON "ManualPriceOverride"("cardId");

-- CreateIndex
CREATE INDEX "ManualPriceOverride_variant_idx" ON "ManualPriceOverride"("variant");

-- CreateIndex
CREATE INDEX "ManualPriceOverride_currency_idx" ON "ManualPriceOverride"("currency");

-- CreateIndex
CREATE UNIQUE INDEX "ManualPriceOverride_cardId_variant_currency_key" ON "ManualPriceOverride"("cardId", "variant", "currency");
