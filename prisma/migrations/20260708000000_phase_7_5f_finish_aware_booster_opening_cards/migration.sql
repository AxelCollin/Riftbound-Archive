-- Add Phase 7.5F finish-aware booster opening card compatibility.
ALTER TABLE "BoosterOpeningCard" ADD COLUMN "physicalFinish" TEXT;

UPDATE "BoosterOpeningCard"
SET "physicalFinish" = 'NORMAL'
WHERE "variant" = 'NORMAL';

UPDATE "BoosterOpeningCard"
SET "physicalFinish" = 'FOIL'
WHERE "variant" = 'FOIL';

-- Legacy SHOWCASE compatibility opening rows intentionally keep physicalFinish NULL.
-- Showcase is a collector category / treatment, not a physical finish.
CREATE INDEX "BoosterOpeningCard_physicalFinish_idx" ON "BoosterOpeningCard"("physicalFinish");
