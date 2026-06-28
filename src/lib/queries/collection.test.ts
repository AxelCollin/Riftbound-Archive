import { describe, expect, it } from "vitest";
import {
  createCollectionRows,
  filterCollectionRows,
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


describe("collection filtering", () => {
  const rows = createCollectionRows([
    card({
      id: "ahri",
      name: "Ahri, Vastayan Renegade",
      collectorNumber: "001",
      rarity: "RARE",
      kind: "GAMEPLAY",
      hasShowcase: true,
      set: { code: "ORG", name: "Origins" },
      translations: [{ locale: "fr-FR", name: "Ahri, vastaya rebelle" }],
      collectionEntries: [
        { variant: "FOIL", quantity: 2 },
        { variant: "SHOWCASE", quantity: 0 },
      ],
    }),
    card({
      id: "energy",
      name: "Ionian Energy",
      collectorNumber: "E12",
      rarity: "UNKNOWN",
      kind: "ENERGY",
      set: { code: "ENE", name: "Energy" },
      collectionEntries: [{ variant: "FOIL", quantity: 0 }],
    }),
    card({
      id: "common",
      name: "Brave Recruit",
      collectorNumber: "042",
      rarity: "COMMON",
      kind: "GAMEPLAY",
      set: { code: "BAS", name: "Base" },
      collectionEntries: [{ variant: "NORMAL", quantity: 4 }],
    }),
  ]);

  it("returns all rows for empty and all filters", () => {
    expect(filterCollectionRows(rows)).toEqual(rows);
    expect(
      filterCollectionRows(rows, {
        searchText: " ",
        rarity: "ALL",
        kind: "ALL",
        variant: "ALL",
        ownedStatus: "ALL",
      }),
    ).toEqual(rows);
  });

  it("matches text search by card name", () => {
    expect(filterCollectionRows(rows, { searchText: "ahri" }).map((row) => row.cardId)).toEqual([
      "ahri",
      "ahri",
    ]);
  });

  it("matches text search by set code", () => {
    expect(filterCollectionRows(rows, { searchText: "ene" }).map((row) => row.cardId)).toEqual(["energy"]);
  });

  it("matches text search by collector number", () => {
    expect(filterCollectionRows(rows, { searchText: "042" }).map((row) => row.cardId)).toEqual([
      "common",
      "common",
    ]);
  });

  it("filters by rarity", () => {
    expect(filterCollectionRows(rows, { rarity: "RARE" }).map((row) => row.cardId)).toEqual(["ahri", "ahri"]);
  });

  it("filters by kind/type", () => {
    expect(filterCollectionRows(rows, { kind: "ENERGY" }).map((row) => row.cardId)).toEqual(["energy"]);
  });

  it("filters by variant", () => {
    expect(filterCollectionRows(rows, { variant: "NORMAL" }).map((row) => row.cardId)).toEqual(["common"]);
  });

  it("keeps owned rows when owned-only filter is selected", () => {
    expect(filterCollectionRows(rows, { ownedStatus: "OWNED" }).map((row) => row.rowId)).toEqual([
      "ahri:FOIL",
      "common:NORMAL",
    ]);
  });

  it("keeps missing rows when missing-only filter is selected", () => {
    expect(filterCollectionRows(rows, { ownedStatus: "MISSING" }).map((row) => row.rowId)).toEqual([
      "ahri:SHOWCASE",
      "energy:FOIL",
      "common:FOIL",
    ]);
  });

  it("combines filters", () => {
    expect(
      filterCollectionRows(rows, {
        searchText: "org",
        rarity: "RARE",
        kind: "GAMEPLAY",
        variant: "SHOWCASE",
        ownedStatus: "MISSING",
      }).map((row) => row.rowId),
    ).toEqual(["ahri:SHOWCASE"]);
  });
});
