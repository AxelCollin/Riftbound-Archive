-- Add Phase 7.5D finish-aware deck allocation persistence.
ALTER TABLE "DeckCardAllocation" ADD COLUMN "physicalFinish" TEXT;

UPDATE "DeckCardAllocation"
SET "physicalFinish" = 'NORMAL'
WHERE "variant" = 'NORMAL';

UPDATE "DeckCardAllocation"
SET "physicalFinish" = 'FOIL'
WHERE "variant" = 'FOIL';

-- Legacy SHOWCASE compatibility allocation rows intentionally keep physicalFinish NULL.
CREATE INDEX "DeckCardAllocation_physicalFinish_idx" ON "DeckCardAllocation"("physicalFinish");
