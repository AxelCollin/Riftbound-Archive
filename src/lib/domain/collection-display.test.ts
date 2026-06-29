import { describe, expect, it } from "vitest";
import {
  defaultCollectionDisplayMode,
  filterCollectionRows,
  getCollectionDisplayQuantity,
  type CollectionDisplayRow,
} from "./collection-display";

function row(overrides: Partial<CollectionDisplayRow>): CollectionDisplayRow {
  return {
    rowId: "card-1:FOIL",
    cardId: "card-1",
    cardName: "Base Name",
    setCode: "ORG",
    setName: "Origins",
    collectorNumber: "001",
    rarity: "COMMON",
    kind: "GAMEPLAY",
    printTreatment: "REGULAR",
    variant: "FOIL",
    ownedQuantity: 0,
    binderReservedQuantity: 0,
    availableQuantity: 0,
    ...overrides,
  };
}

describe("collection display quantities", () => {
  const displayRow = row({ ownedQuantity: 4, binderReservedQuantity: 1, availableQuantity: 3 });

  it("uses owned quantity as the default display mode", () => {
    expect(defaultCollectionDisplayMode).toBe("OWNED");
    expect(getCollectionDisplayQuantity(displayRow)).toBe(4);
  });

  it("selects already-computed available quantity for available display mode", () => {
    expect(getCollectionDisplayQuantity(displayRow, "AVAILABLE")).toBe(3);
  });
});

describe("collection filtering", () => {
  const rows: CollectionDisplayRow[] = [
    row({
      rowId: "ahri:FOIL",
      cardId: "ahri",
      cardName: "Ahri, vastaya rebelle",
      collectorNumber: "001",
      rarity: "RARE",
      kind: "GAMEPLAY",
      variant: "FOIL",
      ownedQuantity: 2,
    }),
    row({
      rowId: "ahri:SHOWCASE",
      cardId: "ahri",
      cardName: "Ahri, vastaya rebelle",
      collectorNumber: "001",
      rarity: "RARE",
      kind: "GAMEPLAY",
      variant: "SHOWCASE",
      ownedQuantity: 0,
    }),
    row({
      rowId: "energy:FOIL",
      cardId: "energy",
      cardName: "Ionian Energy",
      setCode: "ENE",
      setName: "Energy",
      collectorNumber: "E12",
      rarity: "UNKNOWN",
      kind: "ENERGY",
      variant: "FOIL",
      ownedQuantity: 0,
    }),
    row({
      rowId: "common:NORMAL",
      cardId: "common",
      cardName: "Brave Recruit",
      setCode: "BAS",
      setName: "Base",
      collectorNumber: "042",
      rarity: "COMMON",
      kind: "GAMEPLAY",
      variant: "NORMAL",
      ownedQuantity: 4,
    }),
    row({
      rowId: "common:FOIL",
      cardId: "common",
      cardName: "Brave Recruit",
      setCode: "BAS",
      setName: "Base",
      collectorNumber: "042",
      rarity: "COMMON",
      kind: "GAMEPLAY",
      variant: "FOIL",
      ownedQuantity: 0,
    }),
  ];

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
    expect(filterCollectionRows(rows, { searchText: "ahri" }).map((candidate) => candidate.cardId)).toEqual(["ahri", "ahri"]);
  });

  it("matches accent-insensitive text search by card name", () => {
    expect(filterCollectionRows(rows, { searchText: "rebèlle" }).map((candidate) => candidate.cardId)).toEqual(["ahri", "ahri"]);
  });

  it("matches text search by set code", () => {
    expect(filterCollectionRows(rows, { searchText: "ene" }).map((candidate) => candidate.cardId)).toEqual(["energy"]);
  });

  it("matches text search by collector number", () => {
    expect(filterCollectionRows(rows, { searchText: "042" }).map((candidate) => candidate.cardId)).toEqual(["common", "common"]);
  });

  it("filters by rarity", () => {
    expect(filterCollectionRows(rows, { rarity: "RARE" }).map((candidate) => candidate.cardId)).toEqual(["ahri", "ahri"]);
  });

  it("filters by kind/type", () => {
    expect(filterCollectionRows(rows, { kind: "ENERGY" }).map((candidate) => candidate.cardId)).toEqual(["energy"]);
  });

  it("filters by variant", () => {
    expect(filterCollectionRows(rows, { variant: "NORMAL" }).map((candidate) => candidate.cardId)).toEqual(["common"]);
  });

  it("keeps owned rows when owned-only filter is selected", () => {
    expect(filterCollectionRows(rows, { ownedStatus: "OWNED" }).map((candidate) => candidate.rowId)).toEqual(["ahri:FOIL", "common:NORMAL"]);
  });

  it("keeps missing rows when missing-only filter is selected", () => {
    expect(filterCollectionRows(rows, { ownedStatus: "MISSING" }).map((candidate) => candidate.rowId)).toEqual(["ahri:SHOWCASE", "energy:FOIL", "common:FOIL"]);
  });

  it("combines filters", () => {
    expect(
      filterCollectionRows(rows, {
        searchText: "org",
        rarity: "RARE",
        kind: "GAMEPLAY",
        variant: "SHOWCASE",
        ownedStatus: "MISSING",
      }).map((candidate) => candidate.rowId),
    ).toEqual(["ahri:SHOWCASE"]);
  });
});
