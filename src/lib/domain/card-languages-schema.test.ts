import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("CardLanguage schema foundation", () => {
  const schema = readFileSync("prisma/schema.prisma", "utf8");
  const migration = readFileSync("prisma/migrations/20260709000000_phase_7_5j_physical_card_languages/migration.sql", "utf8");

  it("adds the Prisma CardLanguage enum without changing CardTranslation.locale", () => {
    expect(schema).toContain("enum CardLanguage");
    expect(schema).toContain("FR");
    expect(schema).toContain("EN");
    expect(schema).toContain("ZH");
    expect(schema).toContain("UNKNOWN");
    expect(schema).toContain("model CardTranslation");
    expect(schema).toContain("locale     String");
    expect(schema.slice(schema.indexOf("model CardTranslation"), schema.indexOf("model CollectionEntry"))).not.toContain("cardLanguage");
  });

  it("persists cardLanguage on physical-copy and pricing compatibility tables", () => {
    for (const table of ["CollectionEntry", "CollectionTransaction", "DeckCardAllocation", "BinderOverride", "BoosterOpeningCard", "PriceMapping", "CardPrice", "ManualPriceOverride"]) {
      expect(schema).toMatch(new RegExp(`model ${table} [\\s\\S]*cardLanguage[\\s]+CardLanguage[\\s]+@default\\(UNKNOWN\\)`));
      expect(migration).toContain(`ALTER TABLE "${table}" ADD COLUMN "cardLanguage" TEXT NOT NULL DEFAULT 'UNKNOWN'`);
      expect(migration).toContain(`UPDATE "${table}" SET "cardLanguage" = 'UNKNOWN'`);
    }
  });

  it("updates uniqueness so same card and finish can coexist in different languages", () => {
    expect(schema).toContain("@@unique([cardId, variant, cardLanguage])");
    expect(schema).toContain("@@unique([deckId, cardId, variant, cardLanguage])");
    expect(schema).toContain("@@unique([boosterOpeningId, cardId, variant, cardLanguage])");
    expect(schema).toContain("@@unique([providerId, cardId, variant, cardLanguage])");
    expect(schema).toContain("@@unique([cardId, variant, cardLanguage, currency])");
  });
});
