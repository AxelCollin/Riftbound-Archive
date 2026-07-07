import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const migrationSql = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../../../prisma/migrations/20260706000000_phase_7_5a_card_taxonomy_foundation/migration.sql"), "utf8");

describe("Phase 7.5A showcase variant migration", () => {
  it("converts persisted SHOWCASE rows for showcase collector printings to FOIL before they reach read paths", () => {
    for (const tableName of [
      "CollectionEntry",
      "CollectionTransaction",
      "BinderOverride",
      "DeckCardAllocation",
      "BoosterOpeningCard",
      "PriceMapping",
      "CardPrice",
      "ManualPriceOverride",
    ]) {
      expect(migrationSql).toContain(`UPDATE "${tableName}"`);
      expect(migrationSql).toContain(`"${tableName}"."cardId"`);
    }

    expect(migrationSql).toContain("UPDATE \"DeckCard\"");
    expect(migrationSql).toContain("\"preferredVariant\" = 'FOIL'");
    expect(migrationSql).toContain("\"collectorCategory\" = 'SHOWCASE'");
    expect(migrationSql).toContain("\"variant\" = 'SHOWCASE'");
    expect(migrationSql).toContain("\"variant\" = 'FOIL'");
  });

  it("merges quantities before deleting duplicate rows for unique card and variant tables", () => {
    expect(migrationSql).toContain('UPDATE "CollectionEntry"\nSET\n    "quantity" = "quantity" +');
    expect(migrationSql).toContain('DELETE FROM "CollectionEntry"');
    expect(migrationSql).toContain('UPDATE "DeckCard"\nSET\n    "quantity" = "quantity" +');
    expect(migrationSql).toContain('DELETE FROM "DeckCard"');
    expect(migrationSql).toContain('UPDATE "DeckCardAllocation"\nSET\n    "quantity" = "quantity" +');
    expect(migrationSql).toContain('DELETE FROM "DeckCardAllocation"');
    expect(migrationSql).toContain('UPDATE "BoosterOpeningCard"\nSET\n    "quantity" = "quantity" +');
    expect(migrationSql).toContain('DELETE FROM "BoosterOpeningCard"');
  });
});
