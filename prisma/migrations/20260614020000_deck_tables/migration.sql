-- CreateTable
CREATE TABLE "Deck" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'THEORETICAL',
    "description" TEXT,
    "allocationStrategy" TEXT NOT NULL DEFAULT 'PRESERVE_PREMIUM_VARIANTS',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "DeckCard" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "deckId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "preferredVariant" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DeckCard_deckId_fkey" FOREIGN KEY ("deckId") REFERENCES "Deck" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DeckCard_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DeckCardAllocation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "deckId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "variant" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DeckCardAllocation_deckId_fkey" FOREIGN KEY ("deckId") REFERENCES "Deck" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DeckCardAllocation_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Deck_status_idx" ON "Deck"("status");

-- CreateIndex
CREATE INDEX "Deck_createdAt_idx" ON "Deck"("createdAt");

-- CreateIndex
CREATE INDEX "Deck_updatedAt_idx" ON "Deck"("updatedAt");

-- CreateIndex
CREATE INDEX "DeckCard_deckId_idx" ON "DeckCard"("deckId");

-- CreateIndex
CREATE INDEX "DeckCard_cardId_idx" ON "DeckCard"("cardId");

-- CreateIndex
CREATE INDEX "DeckCard_preferredVariant_idx" ON "DeckCard"("preferredVariant");

-- CreateIndex
CREATE UNIQUE INDEX "DeckCard_deckId_cardId_preferredVariant_key" ON "DeckCard"("deckId", "cardId", "preferredVariant");

-- CreateIndex
CREATE INDEX "DeckCardAllocation_deckId_idx" ON "DeckCardAllocation"("deckId");

-- CreateIndex
CREATE INDEX "DeckCardAllocation_cardId_idx" ON "DeckCardAllocation"("cardId");

-- CreateIndex
CREATE INDEX "DeckCardAllocation_variant_idx" ON "DeckCardAllocation"("variant");

-- CreateIndex
CREATE UNIQUE INDEX "DeckCardAllocation_deckId_cardId_variant_key" ON "DeckCardAllocation"("deckId", "cardId", "variant");
