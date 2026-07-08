import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const migrationSql = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../../../prisma/migrations/20260707020000_phase_7_5e_finish_aware_binder_overrides/migration.sql"), "utf8");

describe("Phase 7.5E binder override physical finish migration", () => {
  it("adds nullable physicalFinish to binder overrides", () => {
    expect(migrationSql).toContain('ALTER TABLE "BinderOverride" ADD COLUMN "physicalFinish" TEXT');
    expect(migrationSql).toContain('CREATE INDEX "BinderOverride_physicalFinish_idx"');
  });

  it("backfills legacy NORMAL and FOIL variants without creating a SHOWCASE finish", () => {
    expect(migrationSql).toContain('SET "physicalFinish" = \'NORMAL\'\nWHERE "variant" = \'NORMAL\'');
    expect(migrationSql).toContain('SET "physicalFinish" = \'FOIL\'\nWHERE "variant" = \'FOIL\'');
    expect(migrationSql).not.toContain('"physicalFinish" = \'SHOWCASE\'');
    expect(migrationSql).toContain("Legacy SHOWCASE compatibility override rows intentionally keep physicalFinish NULL");
  });
});
