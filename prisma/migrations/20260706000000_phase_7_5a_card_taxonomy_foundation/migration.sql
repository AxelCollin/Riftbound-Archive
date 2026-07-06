-- Phase 7.5A card taxonomy and gameplay identity foundation.
-- Existing CardVariant-based ownership units remain unchanged in this migration.

ALTER TABLE "Card" ADD COLUMN "gameplayIdentityKey" TEXT;
ALTER TABLE "Card" ADD COLUMN "gameplayType" TEXT NOT NULL DEFAULT 'UNKNOWN';
ALTER TABLE "Card" ADD COLUMN "gameplayRarity" TEXT NOT NULL DEFAULT 'UNKNOWN';
ALTER TABLE "Card" ADD COLUMN "collectorCategory" TEXT NOT NULL DEFAULT 'STANDARD';
ALTER TABLE "Card" ADD COLUMN "showcaseTreatment" TEXT;

UPDATE "Card"
SET
    "collectorCategory" = 'SHOWCASE',
    "showcaseTreatment" = 'ALTERNATIVE'
WHERE "printTreatment" = 'ALT';

UPDATE "Card"
SET
    "collectorCategory" = 'SHOWCASE',
    "showcaseTreatment" = 'OVERNUMBER'
WHERE "printTreatment" = 'OVERNUMBER';

UPDATE "Card"
SET
    "collectorCategory" = 'SHOWCASE',
    "showcaseTreatment" = 'ULTIMATE'
WHERE "rarity" = 'ULTIMATE'
  AND "showcaseTreatment" IS NULL;

CREATE TABLE "CardFactionMembership" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cardId" TEXT NOT NULL,
    "faction" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CardFactionMembership_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "CardFactionMembership_cardId_faction_key" ON "CardFactionMembership"("cardId", "faction");
CREATE INDEX "CardFactionMembership_cardId_idx" ON "CardFactionMembership"("cardId");
CREATE INDEX "CardFactionMembership_faction_idx" ON "CardFactionMembership"("faction");
CREATE INDEX "Card_gameplayIdentityKey_idx" ON "Card"("gameplayIdentityKey");
CREATE INDEX "Card_gameplayType_idx" ON "Card"("gameplayType");
CREATE INDEX "Card_gameplayRarity_idx" ON "Card"("gameplayRarity");
CREATE INDEX "Card_collectorCategory_idx" ON "Card"("collectorCategory");
CREATE INDEX "Card_showcaseTreatment_idx" ON "Card"("showcaseTreatment");
