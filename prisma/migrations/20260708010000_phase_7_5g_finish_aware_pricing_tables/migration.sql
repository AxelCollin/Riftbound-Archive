-- Phase 7.5G: add finish-aware compatibility columns to pricing tables.
ALTER TABLE "PriceMapping" ADD COLUMN "physicalFinish" TEXT;
ALTER TABLE "CardPrice" ADD COLUMN "physicalFinish" TEXT;
ALTER TABLE "ManualPriceOverride" ADD COLUMN "physicalFinish" TEXT;

UPDATE "PriceMapping"
SET "physicalFinish" = 'NORMAL'
WHERE "variant" = 'NORMAL';

UPDATE "PriceMapping"
SET "physicalFinish" = 'FOIL'
WHERE "variant" = 'FOIL';

UPDATE "CardPrice"
SET "physicalFinish" = 'NORMAL'
WHERE "variant" = 'NORMAL';

UPDATE "CardPrice"
SET "physicalFinish" = 'FOIL'
WHERE "variant" = 'FOIL';

UPDATE "ManualPriceOverride"
SET "physicalFinish" = 'NORMAL'
WHERE "variant" = 'NORMAL';

UPDATE "ManualPriceOverride"
SET "physicalFinish" = 'FOIL'
WHERE "variant" = 'FOIL';

-- Legacy SHOWCASE compatibility pricing rows intentionally keep physicalFinish NULL.
-- Showcase is a collector category / treatment, not a physical finish.

CREATE INDEX "PriceMapping_physicalFinish_idx" ON "PriceMapping"("physicalFinish");
CREATE INDEX "CardPrice_physicalFinish_idx" ON "CardPrice"("physicalFinish");
CREATE INDEX "ManualPriceOverride_physicalFinish_idx" ON "ManualPriceOverride"("physicalFinish");
