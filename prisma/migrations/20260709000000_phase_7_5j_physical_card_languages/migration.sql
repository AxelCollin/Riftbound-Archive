-- Phase 7.5J: add a physical card language axis for owned copies and compatibility tables.
-- SQLite stores Prisma enums as TEXT. Existing rows are legacy/unknown physical language.
ALTER TABLE "CollectionEntry" ADD COLUMN "cardLanguage" TEXT NOT NULL DEFAULT 'UNKNOWN';
ALTER TABLE "CollectionTransaction" ADD COLUMN "cardLanguage" TEXT NOT NULL DEFAULT 'UNKNOWN';
ALTER TABLE "DeckCardAllocation" ADD COLUMN "cardLanguage" TEXT NOT NULL DEFAULT 'UNKNOWN';
ALTER TABLE "BinderOverride" ADD COLUMN "cardLanguage" TEXT NOT NULL DEFAULT 'UNKNOWN';
ALTER TABLE "BoosterOpeningCard" ADD COLUMN "cardLanguage" TEXT NOT NULL DEFAULT 'UNKNOWN';
ALTER TABLE "PriceMapping" ADD COLUMN "cardLanguage" TEXT NOT NULL DEFAULT 'UNKNOWN';
ALTER TABLE "CardPrice" ADD COLUMN "cardLanguage" TEXT NOT NULL DEFAULT 'UNKNOWN';
ALTER TABLE "ManualPriceOverride" ADD COLUMN "cardLanguage" TEXT NOT NULL DEFAULT 'UNKNOWN';

UPDATE "CollectionEntry" SET "cardLanguage" = 'UNKNOWN' WHERE "cardLanguage" IS NULL OR "cardLanguage" = '';
UPDATE "CollectionTransaction" SET "cardLanguage" = 'UNKNOWN' WHERE "cardLanguage" IS NULL OR "cardLanguage" = '';
UPDATE "DeckCardAllocation" SET "cardLanguage" = 'UNKNOWN' WHERE "cardLanguage" IS NULL OR "cardLanguage" = '';
UPDATE "BinderOverride" SET "cardLanguage" = 'UNKNOWN' WHERE "cardLanguage" IS NULL OR "cardLanguage" = '';
UPDATE "BoosterOpeningCard" SET "cardLanguage" = 'UNKNOWN' WHERE "cardLanguage" IS NULL OR "cardLanguage" = '';
UPDATE "PriceMapping" SET "cardLanguage" = 'UNKNOWN' WHERE "cardLanguage" IS NULL OR "cardLanguage" = '';
UPDATE "CardPrice" SET "cardLanguage" = 'UNKNOWN' WHERE "cardLanguage" IS NULL OR "cardLanguage" = '';
UPDATE "ManualPriceOverride" SET "cardLanguage" = 'UNKNOWN' WHERE "cardLanguage" IS NULL OR "cardLanguage" = '';

DROP INDEX IF EXISTS "CollectionEntry_cardId_variant_key";
DROP INDEX IF EXISTS "DeckCardAllocation_deckId_cardId_variant_key";
DROP INDEX IF EXISTS "BinderOverride_cardId_key";
DROP INDEX IF EXISTS "BoosterOpeningCard_boosterOpeningId_cardId_variant_key";
DROP INDEX IF EXISTS "PriceMapping_providerId_cardId_variant_key";
DROP INDEX IF EXISTS "ManualPriceOverride_cardId_variant_currency_key";

CREATE UNIQUE INDEX "CollectionEntry_cardId_variant_cardLanguage_key" ON "CollectionEntry"("cardId", "variant", "cardLanguage");
CREATE UNIQUE INDEX "DeckCardAllocation_deckId_cardId_variant_cardLanguage_key" ON "DeckCardAllocation"("deckId", "cardId", "variant", "cardLanguage");
CREATE UNIQUE INDEX "BinderOverride_cardId_cardLanguage_key" ON "BinderOverride"("cardId", "cardLanguage");
CREATE UNIQUE INDEX "BoosterOpeningCard_boosterOpeningId_cardId_variant_cardLanguage_key" ON "BoosterOpeningCard"("boosterOpeningId", "cardId", "variant", "cardLanguage");
CREATE UNIQUE INDEX "PriceMapping_providerId_cardId_variant_cardLanguage_key" ON "PriceMapping"("providerId", "cardId", "variant", "cardLanguage");
CREATE UNIQUE INDEX "ManualPriceOverride_cardId_variant_cardLanguage_currency_key" ON "ManualPriceOverride"("cardId", "variant", "cardLanguage", "currency");

CREATE INDEX "CollectionEntry_cardLanguage_idx" ON "CollectionEntry"("cardLanguage");
CREATE INDEX "CollectionTransaction_cardLanguage_idx" ON "CollectionTransaction"("cardLanguage");
CREATE INDEX "DeckCardAllocation_cardLanguage_idx" ON "DeckCardAllocation"("cardLanguage");
CREATE INDEX "BinderOverride_cardLanguage_idx" ON "BinderOverride"("cardLanguage");
CREATE INDEX "BoosterOpeningCard_cardLanguage_idx" ON "BoosterOpeningCard"("cardLanguage");
CREATE INDEX "PriceMapping_cardLanguage_idx" ON "PriceMapping"("cardLanguage");
CREATE INDEX "CardPrice_cardLanguage_idx" ON "CardPrice"("cardLanguage");
CREATE INDEX "ManualPriceOverride_cardLanguage_idx" ON "ManualPriceOverride"("cardLanguage");
