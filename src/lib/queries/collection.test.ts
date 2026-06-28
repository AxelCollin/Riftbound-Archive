import { describe, expect, it } from "vitest";
import {
  createCollectionRows,
  getDisplayCardName,
  summarizeCollectionRows,
  type CollectionCardRecord,
} from "./collection";

function card(overrides: Partial<CollectionCardRecord>): CollectionCardRecord {
  return {
    id: "card-1",
    name: "Base Name",
    collectorNumber: "001",
    rarity: "COMMON",
    kind: "GAMEPLAY",
    printTreatment: "REGULAR",
    hasShowcase: false,
    set: { code: "ORG", name: "Origins" },
    translations: [],
    collectionEntries: [],
    ...overrides,
  };
}

describe("collection query mapping", () => {
  it("includes trackable cards and excludes TOKEN/RULES cards", () => {
    const rows = createCollectionRows([
      card({ id: "gameplay", kind: "GAMEPLAY" }),
      card({ id: "energy", kind: "ENERGY", rarity: "UNKNOWN" }),
      card({ id: "token", kind: "TOKEN" }),
      card({ id: "rules", kind: "RULES" }),
    ]);

    expect(rows.map((row) => row.cardId)).toEqual(["gameplay", "gameplay", "energy"]);
  });

  it("creates allowed variant rows without introducing showcase foil", () => {
    const rows = createCollectionRows([
      card({ id: "common", rarity: "COMMON" }),
      card({ id: "rare", rarity: "RARE" }),
      card({ id: "showcase", rarity: "EPIC", hasShowcase: true }),
    ]);

    expect(rows.filter((row) => row.cardId === "common").map((row) => row.variant)).toEqual(["NORMAL", "FOIL"]);
    expect(rows.filter((row) => row.cardId === "rare").map((row) => row.variant)).toEqual(["FOIL"]);
    expect(rows.filter((row) => row.cardId === "showcase").map((row) => row.variant)).toEqual([
      "FOIL",
      "SHOWCASE",
    ]);
  });

  it("maps existing snapshots and renders missing entries as quantity 0", () => {
    const rows = createCollectionRows([
      card({
        id: "owned-card",
        collectionEntries: [{ variant: "FOIL", quantity: 3 }],
      }),
    ]);

    expect(rows).toMatchObject([
      { cardId: "owned-card", variant: "NORMAL", ownedQuantity: 0 },
      { cardId: "owned-card", variant: "FOIL", ownedQuantity: 3 },
    ]);
  });

  it("uses deterministic translation fallback order", () => {
    expect(
      getDisplayCardName(
        card({
          name: "Base Name",
          translations: [
            { locale: "en-US", name: "English Name" },
            { locale: "fr", name: "Nom français" },
            { locale: "fr-FR", name: "Nom France" },
          ],
        }),
      ),
    ).toBe("Nom France");

    expect(getDisplayCardName(card({ translations: [{ locale: "de", name: "Deutsch" }] }))).toBe("Base Name");
  });

  it("summarizes owned, trackable, and missing rows", () => {
    const rows = createCollectionRows([
      card({ id: "first", collectionEntries: [{ variant: "NORMAL", quantity: 2 }] }),
      card({ id: "second", rarity: "RARE" }),
    ]);

    expect(summarizeCollectionRows(rows)).toEqual({
      totalOwnedCopies: 2,
      ownedRows: 1,
      trackableRows: 3,
      missingRows: 2,
    });
  });
});
