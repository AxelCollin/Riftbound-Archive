import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const migrationSql = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../../../prisma/migrations/20260708010000_phase_7_5g_finish_aware_pricing_tables/migration.sql"), "utf8");

describe("Phase 7.5G pricing physical finish migration", () => {
  it("adds nullable physicalFinish to pricing compatibility tables", () => {
    expect(migrationSql).toContain('ALTER TABLE "PriceMapping" ADD COLUMN "physicalFinish" TEXT');
    expect(migrationSql).toContain('ALTER TABLE "CardPrice" ADD COLUMN "physicalFinish" TEXT');
    expect(migrationSql).toContain('ALTER TABLE "ManualPriceOverride" ADD COLUMN "physicalFinish" TEXT');
    expect(migrationSql).toContain('CREATE INDEX "PriceMapping_physicalFinish_idx"');
    expect(migrationSql).toContain('CREATE INDEX "CardPrice_physicalFinish_idx"');
    expect(migrationSql).toContain('CREATE INDEX "ManualPriceOverride_physicalFinish_idx"');
  });

  it.each(["PriceMapping", "CardPrice", "ManualPriceOverride"])("backfills %s NORMAL and FOIL variants and leaves SHOWCASE null", (tableName) => {
    expect(migrationSql).toContain(`UPDATE "${tableName}"\nSET "physicalFinish" = 'NORMAL'\nWHERE "variant" = 'NORMAL'`);
    expect(migrationSql).toContain(`UPDATE "${tableName}"\nSET "physicalFinish" = 'FOIL'\nWHERE "variant" = 'FOIL'`);
  });

  it("does not create SHOWCASE as a physical finish", () => {
    expect(migrationSql).not.toContain('"physicalFinish" = \'SHOWCASE\'');
    expect(migrationSql).toContain("Legacy SHOWCASE compatibility pricing rows intentionally keep physicalFinish NULL");
    expect(migrationSql).toContain("Showcase is a collector category / treatment, not a physical finish");
  });
});
