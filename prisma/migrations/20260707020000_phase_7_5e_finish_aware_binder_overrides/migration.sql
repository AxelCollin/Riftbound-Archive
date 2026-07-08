-- Add Phase 7.5E finish-aware binder override compatibility.
ALTER TABLE "BinderOverride" ADD COLUMN "physicalFinish" TEXT;

UPDATE "BinderOverride"
SET "physicalFinish" = 'NORMAL'
WHERE "variant" = 'NORMAL';

UPDATE "BinderOverride"
SET "physicalFinish" = 'FOIL'
WHERE "variant" = 'FOIL';

-- Legacy SHOWCASE compatibility override rows intentionally keep physicalFinish NULL.
-- Showcase is a collector category / treatment, not a physical finish.
CREATE INDEX "BinderOverride_physicalFinish_idx" ON "BinderOverride"("physicalFinish");
