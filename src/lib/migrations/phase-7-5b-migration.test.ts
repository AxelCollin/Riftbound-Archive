import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const migrationSql = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../../../prisma/migrations/20260707000000_phase_7_5b_finish_aware_collection_foundation/migration.sql"), "utf8");

describe("Phase 7.5B physical finish migration", () => {
  it("adds physicalFinish to collection ownership snapshots and transactions", () => {
    expect(migrationSql).toContain('ALTER TABLE "CollectionEntry" ADD COLUMN "physicalFinish" TEXT');
    expect(migrationSql).toContain('ALTER TABLE "CollectionTransaction" ADD COLUMN "physicalFinish" TEXT');
    expect(migrationSql).toContain('CREATE INDEX "CollectionEntry_physicalFinish_idx"');
    expect(migrationSql).toContain('CREATE INDEX "CollectionTransaction_physicalFinish_idx"');
  });

  it("backfills legacy NORMAL and FOIL variants without creating a SHOWCASE finish", () => {
    expect(migrationSql).toContain('SET "physicalFinish" = \'NORMAL\'\nWHERE "variant" = \'NORMAL\'');
    expect(migrationSql).toContain('SET "physicalFinish" = \'FOIL\'\nWHERE "variant" = \'FOIL\'');
    expect(migrationSql).not.toContain("physicalFinish\" = 'SHOWCASE'");
    expect(migrationSql).toContain("Showcase is a collector category / treatment, not a physical finish");
  });
});
