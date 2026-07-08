import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const migrationSql = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../../../prisma/migrations/20260708000000_phase_7_5f_finish_aware_booster_opening_cards/migration.sql"), "utf8");

describe("Phase 7.5F booster opening physical finish migration", () => {
  it("adds physicalFinish to booster opening cards", () => {
    expect(migrationSql).toContain('ALTER TABLE "BoosterOpeningCard" ADD COLUMN "physicalFinish" TEXT');
    expect(migrationSql).toContain('CREATE INDEX "BoosterOpeningCard_physicalFinish_idx"');
  });

  it("backfills legacy NORMAL and FOIL rows without creating a SHOWCASE finish", () => {
    expect(migrationSql).toContain('SET "physicalFinish" = \'NORMAL\'\nWHERE "variant" = \'NORMAL\'');
    expect(migrationSql).toContain('SET "physicalFinish" = \'FOIL\'\nWHERE "variant" = \'FOIL\'');
    expect(migrationSql).not.toContain("physicalFinish\" = 'SHOWCASE'");
    expect(migrationSql).toContain("Showcase is a collector category / treatment, not a physical finish");
  });
});
