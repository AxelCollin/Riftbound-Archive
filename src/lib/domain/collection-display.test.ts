import { describe, expect, it } from "vitest";
import {
  defaultCollectionDisplayMode,
  filterCollectionRows,
  getCollectionDisplayQuantity,
  type CollectionDisplayRow,
} from "./collection-display";

function row(overrides: Partial<CollectionDisplayRow>): CollectionDisplayRow {
  return {
    rowId: "card-1",
    cardId: "card-1",
    cardName: "Base Name",
    officialImageUrl: null,
    setCode: "ORG",
    setName: "Origins",
    collectorNumber: "001",
    rarity: "COMMON",
    kind: "GAMEPLAY",
    printTreatment: "REGULAR",
    normalOwnedQuantity: 0,
    normalBinderReservedQuantity: 0,
    normalAvailableQuantity: 0,
    foilOwnedQuantity: 0,
    foilBinderReservedQuantity: 0,
    foilAvailableQuantity: 0,
    legacyShowcaseOwnedQuantity: 0,
    legacyShowcaseBinderReservedQuantity: 0,
    legacyShowcaseAvailableQuantity: 0,
    totalOwnedQuantity: 0,
    totalBinderReservedQuantity: 0,
    totalAvailableQuantity: 0,
    ...overrides,
  };
}

describe("collection display quantities", () => {
  const displayRow = row({
    normalOwnedQuantity: 2,
    normalAvailableQuantity: 2,
    foilOwnedQuantity: 2,
    foilBinderReservedQuantity: 1,
    foilAvailableQuantity: 1,
    totalOwnedQuantity: 4,
    totalBinderReservedQuantity: 1,
    totalAvailableQuantity: 3,
  });

  it("uses total owned quantity as the default display mode", () => {
    expect(defaultCollectionDisplayMode).toBe("OWNED");
    expect(getCollectionDisplayQuantity(displayRow)).toBe(4);
  });

  it("selects already-computed total available quantity for available display mode", () => {
    expect(getCollectionDisplayQuantity(displayRow, "AVAILABLE")).toBe(3);
  });
});

describe("collection filtering", () => {
  const rows: CollectionDisplayRow[] = [
    row({
      rowId: "ahri-standard",
      cardId: "ahri-standard",
      cardName: "Ahri, vastaya rebelle",
      collectorNumber: "001",
      rarity: "RARE",
      kind: "GAMEPLAY",
      foilOwnedQuantity: 2,
      totalOwnedQuantity: 2,
      totalAvailableQuantity: 1,
    }),
    row({
      rowId: "ahri-showcase",
      cardId: "ahri-showcase",
      cardName: "Ahri, vastaya rebelle",
      collectorNumber: "001S",
      rarity: "RARE",
      kind: "GAMEPLAY",
      collectorCategory: "SHOWCASE",
      printTreatment: "ALT",
      totalOwnedQuantity: 0,
    }),
    row({
      rowId: "energy",
      cardId: "energy",
      cardName: "Ionian Energy",
      setCode: "ENE",
      setName: "Energy",
      collectorNumber: "E12",
      rarity: "UNKNOWN",
      kind: "ENERGY",
      totalOwnedQuantity: 0,
    }),
    row({
      rowId: "legacy-showcase-only",
      cardId: "legacy-showcase-only",
      cardName: "Legacy Showcase Owner",
      setCode: "BAS",
      setName: "Base",
      collectorNumber: "050",
      rarity: "COMMON",
      kind: "GAMEPLAY",
      legacyShowcaseOwnedQuantity: 1,
      legacyShowcaseAvailableQuantity: 1,
      totalOwnedQuantity: 1,
      totalAvailableQuantity: 1,
    }),
    row({
      rowId: "common",
      cardId: "common",
      cardName: "Brave Recruit",
      setCode: "BAS",
      setName: "Base",
      collectorNumber: "042",
      rarity: "COMMON",
      kind: "GAMEPLAY",
      normalOwnedQuantity: 4,
      totalOwnedQuantity: 4,
      totalAvailableQuantity: 3,
    }),
  ];

  it("returns all rows for empty and all filters", () => {
    expect(filterCollectionRows(rows)).toEqual(rows);
    expect(
      filterCollectionRows(rows, {
        searchText: " ",
        rarity: "ALL",
        kind: "ALL",
        ownedStatus: "ALL",
      }),
    ).toEqual(rows);
  });

  it("matches text search by card name", () => {
    expect(filterCollectionRows(rows, { searchText: "ahri" }).map((candidate) => candidate.cardId)).toEqual(["ahri-standard", "ahri-showcase"]);
  });

  it("matches accent-insensitive text search by card name", () => {
    expect(filterCollectionRows(rows, { searchText: "rebèlle" }).map((candidate) => candidate.cardId)).toEqual(["ahri-standard", "ahri-showcase"]);
  });

  it("matches text search by set code", () => {
    expect(filterCollectionRows(rows, { searchText: "ene" }).map((candidate) => candidate.cardId)).toEqual(["energy"]);
  });

  it("matches text search by collector number", () => {
    expect(filterCollectionRows(rows, { searchText: "042" }).map((candidate) => candidate.cardId)).toEqual(["common"]);
  });

  it("filters by rarity", () => {
    expect(filterCollectionRows(rows, { rarity: "RARE" }).map((candidate) => candidate.cardId)).toEqual(["ahri-standard", "ahri-showcase"]);
  });

  it("filters by kind/type", () => {
    expect(filterCollectionRows(rows, { kind: "ENERGY" }).map((candidate) => candidate.cardId)).toEqual(["energy"]);
  });

  it("keeps owned rows based on totalOwnedQuantity when owned-only filter is selected", () => {
    expect(filterCollectionRows(rows, { ownedStatus: "OWNED" }).map((candidate) => candidate.rowId)).toEqual(["ahri-standard", "legacy-showcase-only", "common"]);
  });

  it("keeps missing rows based on totalOwnedQuantity when missing-only filter is selected", () => {
    expect(filterCollectionRows(rows, { ownedStatus: "MISSING" }).map((candidate) => candidate.rowId)).toEqual(["ahri-showcase", "energy"]);
  });

  it("combines filters without a user-facing variant filter", () => {
    expect(
      filterCollectionRows(rows, {
        searchText: "org",
        rarity: "RARE",
        kind: "GAMEPLAY",
        ownedStatus: "MISSING",
      }).map((candidate) => candidate.rowId),
    ).toEqual(["ahri-showcase"]);
  });
});
