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


-- Convert legacy SHOWCASE ownership/usage rows for cards that are now
-- modeled as separate Showcase collector printings. FOIL is the safest
-- compatibility target in the current MVP variant model because these
-- rows represented premium physical printings before Phase 7.5A.
UPDATE "CollectionEntry"
SET
    "quantity" = "quantity" + (
        SELECT "showcaseEntry"."quantity"
        FROM "CollectionEntry" AS "showcaseEntry"
        WHERE "showcaseEntry"."cardId" = "CollectionEntry"."cardId"
          AND "showcaseEntry"."variant" = 'SHOWCASE'
    ),
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "variant" = 'FOIL'
  AND EXISTS (
      SELECT 1
      FROM "CollectionEntry" AS "showcaseEntry"
      JOIN "Card" ON "Card"."id" = "showcaseEntry"."cardId"
      WHERE "showcaseEntry"."cardId" = "CollectionEntry"."cardId"
        AND "showcaseEntry"."variant" = 'SHOWCASE'
        AND "Card"."collectorCategory" = 'SHOWCASE'
  );

DELETE FROM "CollectionEntry"
WHERE "variant" = 'SHOWCASE'
  AND EXISTS (
      SELECT 1
      FROM "Card"
      WHERE "Card"."id" = "CollectionEntry"."cardId"
        AND "Card"."collectorCategory" = 'SHOWCASE'
  )
  AND EXISTS (
      SELECT 1
      FROM "CollectionEntry" AS "foilEntry"
      WHERE "foilEntry"."cardId" = "CollectionEntry"."cardId"
        AND "foilEntry"."variant" = 'FOIL'
  );

UPDATE "CollectionEntry"
SET "variant" = 'FOIL', "updatedAt" = CURRENT_TIMESTAMP
WHERE "variant" = 'SHOWCASE'
  AND EXISTS (
      SELECT 1
      FROM "Card"
      WHERE "Card"."id" = "CollectionEntry"."cardId"
        AND "Card"."collectorCategory" = 'SHOWCASE'
  );

UPDATE "CollectionTransaction"
SET "variant" = 'FOIL'
WHERE "variant" = 'SHOWCASE'
  AND EXISTS (SELECT 1 FROM "Card" WHERE "Card"."id" = "CollectionTransaction"."cardId" AND "Card"."collectorCategory" = 'SHOWCASE');

UPDATE "BinderOverride"
SET "variant" = 'FOIL', "updatedAt" = CURRENT_TIMESTAMP
WHERE "variant" = 'SHOWCASE'
  AND EXISTS (SELECT 1 FROM "Card" WHERE "Card"."id" = "BinderOverride"."cardId" AND "Card"."collectorCategory" = 'SHOWCASE');

UPDATE "DeckCard"
SET
    "quantity" = "quantity" + (
        SELECT "showcaseDeckCard"."quantity"
        FROM "DeckCard" AS "showcaseDeckCard"
        WHERE "showcaseDeckCard"."deckId" = "DeckCard"."deckId"
          AND "showcaseDeckCard"."cardId" = "DeckCard"."cardId"
          AND "showcaseDeckCard"."preferredVariant" = 'SHOWCASE'
    ),
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "preferredVariant" = 'FOIL'
  AND EXISTS (
      SELECT 1
      FROM "DeckCard" AS "showcaseDeckCard"
      JOIN "Card" ON "Card"."id" = "showcaseDeckCard"."cardId"
      WHERE "showcaseDeckCard"."deckId" = "DeckCard"."deckId"
        AND "showcaseDeckCard"."cardId" = "DeckCard"."cardId"
        AND "showcaseDeckCard"."preferredVariant" = 'SHOWCASE'
        AND "Card"."collectorCategory" = 'SHOWCASE'
  );

DELETE FROM "DeckCard"
WHERE "preferredVariant" = 'SHOWCASE'
  AND EXISTS (SELECT 1 FROM "Card" WHERE "Card"."id" = "DeckCard"."cardId" AND "Card"."collectorCategory" = 'SHOWCASE')
  AND EXISTS (
      SELECT 1 FROM "DeckCard" AS "foilDeckCard"
      WHERE "foilDeckCard"."deckId" = "DeckCard"."deckId"
        AND "foilDeckCard"."cardId" = "DeckCard"."cardId"
        AND "foilDeckCard"."preferredVariant" = 'FOIL'
  );

UPDATE "DeckCard"
SET "preferredVariant" = 'FOIL', "updatedAt" = CURRENT_TIMESTAMP
WHERE "preferredVariant" = 'SHOWCASE'
  AND EXISTS (SELECT 1 FROM "Card" WHERE "Card"."id" = "DeckCard"."cardId" AND "Card"."collectorCategory" = 'SHOWCASE');

UPDATE "DeckCardAllocation"
SET
    "quantity" = "quantity" + (
        SELECT "showcaseAllocation"."quantity"
        FROM "DeckCardAllocation" AS "showcaseAllocation"
        WHERE "showcaseAllocation"."deckId" = "DeckCardAllocation"."deckId"
          AND "showcaseAllocation"."cardId" = "DeckCardAllocation"."cardId"
          AND "showcaseAllocation"."variant" = 'SHOWCASE'
    ),
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "variant" = 'FOIL'
  AND EXISTS (
      SELECT 1
      FROM "DeckCardAllocation" AS "showcaseAllocation"
      JOIN "Card" ON "Card"."id" = "showcaseAllocation"."cardId"
      WHERE "showcaseAllocation"."deckId" = "DeckCardAllocation"."deckId"
        AND "showcaseAllocation"."cardId" = "DeckCardAllocation"."cardId"
        AND "showcaseAllocation"."variant" = 'SHOWCASE'
        AND "Card"."collectorCategory" = 'SHOWCASE'
  );

DELETE FROM "DeckCardAllocation"
WHERE "variant" = 'SHOWCASE'
  AND EXISTS (SELECT 1 FROM "Card" WHERE "Card"."id" = "DeckCardAllocation"."cardId" AND "Card"."collectorCategory" = 'SHOWCASE')
  AND EXISTS (
      SELECT 1 FROM "DeckCardAllocation" AS "foilAllocation"
      WHERE "foilAllocation"."deckId" = "DeckCardAllocation"."deckId"
        AND "foilAllocation"."cardId" = "DeckCardAllocation"."cardId"
        AND "foilAllocation"."variant" = 'FOIL'
  );

UPDATE "DeckCardAllocation"
SET "variant" = 'FOIL', "updatedAt" = CURRENT_TIMESTAMP
WHERE "variant" = 'SHOWCASE'
  AND EXISTS (SELECT 1 FROM "Card" WHERE "Card"."id" = "DeckCardAllocation"."cardId" AND "Card"."collectorCategory" = 'SHOWCASE');

UPDATE "BoosterOpeningCard"
SET
    "quantity" = "quantity" + (
        SELECT "showcaseOpeningCard"."quantity"
        FROM "BoosterOpeningCard" AS "showcaseOpeningCard"
        WHERE "showcaseOpeningCard"."boosterOpeningId" = "BoosterOpeningCard"."boosterOpeningId"
          AND "showcaseOpeningCard"."cardId" = "BoosterOpeningCard"."cardId"
          AND "showcaseOpeningCard"."variant" = 'SHOWCASE'
    ),
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "variant" = 'FOIL'
  AND EXISTS (
      SELECT 1
      FROM "BoosterOpeningCard" AS "showcaseOpeningCard"
      JOIN "Card" ON "Card"."id" = "showcaseOpeningCard"."cardId"
      WHERE "showcaseOpeningCard"."boosterOpeningId" = "BoosterOpeningCard"."boosterOpeningId"
        AND "showcaseOpeningCard"."cardId" = "BoosterOpeningCard"."cardId"
        AND "showcaseOpeningCard"."variant" = 'SHOWCASE'
        AND "Card"."collectorCategory" = 'SHOWCASE'
  );

DELETE FROM "BoosterOpeningCard"
WHERE "variant" = 'SHOWCASE'
  AND EXISTS (SELECT 1 FROM "Card" WHERE "Card"."id" = "BoosterOpeningCard"."cardId" AND "Card"."collectorCategory" = 'SHOWCASE')
  AND EXISTS (
      SELECT 1 FROM "BoosterOpeningCard" AS "foilOpeningCard"
      WHERE "foilOpeningCard"."boosterOpeningId" = "BoosterOpeningCard"."boosterOpeningId"
        AND "foilOpeningCard"."cardId" = "BoosterOpeningCard"."cardId"
        AND "foilOpeningCard"."variant" = 'FOIL'
  );

UPDATE "BoosterOpeningCard"
SET "variant" = 'FOIL', "updatedAt" = CURRENT_TIMESTAMP
WHERE "variant" = 'SHOWCASE'
  AND EXISTS (SELECT 1 FROM "Card" WHERE "Card"."id" = "BoosterOpeningCard"."cardId" AND "Card"."collectorCategory" = 'SHOWCASE');

DELETE FROM "PriceMapping"
WHERE "variant" = 'SHOWCASE'
  AND EXISTS (SELECT 1 FROM "Card" WHERE "Card"."id" = "PriceMapping"."cardId" AND "Card"."collectorCategory" = 'SHOWCASE')
  AND EXISTS (
      SELECT 1 FROM "PriceMapping" AS "foilMapping"
      WHERE "foilMapping"."providerId" = "PriceMapping"."providerId"
        AND "foilMapping"."cardId" = "PriceMapping"."cardId"
        AND "foilMapping"."variant" = 'FOIL'
  );

UPDATE "PriceMapping"
SET "variant" = 'FOIL', "updatedAt" = CURRENT_TIMESTAMP
WHERE "variant" = 'SHOWCASE'
  AND EXISTS (SELECT 1 FROM "Card" WHERE "Card"."id" = "PriceMapping"."cardId" AND "Card"."collectorCategory" = 'SHOWCASE');

UPDATE "CardPrice"
SET "variant" = 'FOIL'
WHERE "variant" = 'SHOWCASE'
  AND EXISTS (SELECT 1 FROM "Card" WHERE "Card"."id" = "CardPrice"."cardId" AND "Card"."collectorCategory" = 'SHOWCASE');

DELETE FROM "ManualPriceOverride"
WHERE "variant" = 'SHOWCASE'
  AND EXISTS (SELECT 1 FROM "Card" WHERE "Card"."id" = "ManualPriceOverride"."cardId" AND "Card"."collectorCategory" = 'SHOWCASE')
  AND EXISTS (
      SELECT 1 FROM "ManualPriceOverride" AS "foilOverride"
      WHERE "foilOverride"."cardId" = "ManualPriceOverride"."cardId"
        AND "foilOverride"."variant" = 'FOIL'
        AND "foilOverride"."currency" = "ManualPriceOverride"."currency"
  );

UPDATE "ManualPriceOverride"
SET "variant" = 'FOIL', "updatedAt" = CURRENT_TIMESTAMP
WHERE "variant" = 'SHOWCASE'
  AND EXISTS (SELECT 1 FROM "Card" WHERE "Card"."id" = "ManualPriceOverride"."cardId" AND "Card"."collectorCategory" = 'SHOWCASE');

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
