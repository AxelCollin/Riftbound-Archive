-- Phase 7.5B finish-aware collection ownership foundation.
-- Keep legacy CardVariant columns for compatibility while adding a separate
-- NORMAL/FOIL-only physical finish axis for owned snapshots and history.

ALTER TABLE "CollectionEntry" ADD COLUMN "physicalFinish" TEXT;
ALTER TABLE "CollectionTransaction" ADD COLUMN "physicalFinish" TEXT;

UPDATE "CollectionEntry"
SET "physicalFinish" = 'NORMAL'
WHERE "variant" = 'NORMAL';

UPDATE "CollectionEntry"
SET "physicalFinish" = 'FOIL'
WHERE "variant" = 'FOIL';

UPDATE "CollectionTransaction"
SET "physicalFinish" = 'NORMAL'
WHERE "variant" = 'NORMAL';

UPDATE "CollectionTransaction"
SET "physicalFinish" = 'FOIL'
WHERE "variant" = 'FOIL';

-- Legacy SHOWCASE compatibility rows intentionally keep physicalFinish NULL:
-- Showcase is a collector category / treatment, not a physical finish.

CREATE INDEX "CollectionEntry_physicalFinish_idx" ON "CollectionEntry"("physicalFinish");
CREATE INDEX "CollectionTransaction_physicalFinish_idx" ON "CollectionTransaction"("physicalFinish");
