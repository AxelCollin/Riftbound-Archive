-- CreateTable
CREATE TABLE "AppSetting" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "jsonValue" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Set" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "releasedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Card" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "setId" TEXT NOT NULL,
    "collectorNumber" TEXT,
    "name" TEXT NOT NULL,
    "rarity" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "officialRarityRaw" TEXT,
    "kind" TEXT NOT NULL,
    "printTreatment" TEXT NOT NULL DEFAULT 'REGULAR',
    "printTreatmentRaw" TEXT,
    "hasShowcase" BOOLEAN NOT NULL DEFAULT false,
    "officialImageUrl" TEXT,
    "officialArtist" TEXT,
    "officialRawJson" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Card_setId_fkey" FOREIGN KEY ("setId") REFERENCES "Set" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CardTranslation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cardId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subtitle" TEXT,
    "rulesText" TEXT,
    "flavorText" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CardTranslation_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Set_code_key" ON "Set"("code");

-- CreateIndex
CREATE INDEX "Card_setId_idx" ON "Card"("setId");

-- CreateIndex
CREATE UNIQUE INDEX "Card_setId_collectorNumber_key" ON "Card"("setId", "collectorNumber");

-- CreateIndex
CREATE INDEX "CardTranslation_locale_idx" ON "CardTranslation"("locale");

-- CreateIndex
CREATE UNIQUE INDEX "CardTranslation_cardId_locale_key" ON "CardTranslation"("cardId", "locale");

