import { describe, expect, it } from "vitest";
import { getVariantCount } from "./variants";
import {
  assertOwnedSnapshotVariantsAllowed,
  createOwnedVariantCounts,
  normalizeOwnedSnapshotQuantity,
} from "./collection-quantities";

describe("owned snapshot quantity normalization", () => {
  it("returns zero and positive snapshot quantities unchanged", () => {
    expect(normalizeOwnedSnapshotQuantity({ cardId: "card-1", variant: "NORMAL", quantity: 0 })).toBe(0);
    expect(normalizeOwnedSnapshotQuantity({ cardId: "card-1", variant: "FOIL", quantity: 4 })).toBe(4);
  });

  it("throws a descriptive error for negative snapshot quantities", () => {
    expect(() =>
      normalizeOwnedSnapshotQuantity({ cardId: "card-1", variant: "SHOWCASE", quantity: -1 }),
    ).toThrow("Invalid negative CollectionEntry quantity for card card-1 variant SHOWCASE");
  });
});

describe("owned snapshot variant validation", () => {
  it("accepts snapshot variants allowed for the card", () => {
    expect(() =>
      assertOwnedSnapshotVariantsAllowed("card-1", [{ variant: "NORMAL" }, { variant: "FOIL" }], [
        "NORMAL",
        "FOIL",
      ]),
    ).not.toThrow();
  });

  it("throws a descriptive error for persisted variants unsupported by the card", () => {
    expect(() => assertOwnedSnapshotVariantsAllowed("card-1", [{ variant: "SHOWCASE" }], ["NORMAL", "FOIL"])).toThrow(
      "Invalid CollectionEntry variant SHOWCASE for card card-1",
    );
  });
});

describe("owned variant count composition", () => {
  it("treats missing allowed variant snapshots as zero counts", () => {
    const counts = createOwnedVariantCounts("card-1", ["NORMAL", "FOIL"], []);

    expect(counts).toEqual({});
    expect(getVariantCount(counts, "NORMAL")).toBe(0);
    expect(getVariantCount(counts, "FOIL")).toBe(0);
  });

  it("prefers physicalFinish for normal and foil ownership when present", () => {
    const counts = createOwnedVariantCounts("card-1", ["NORMAL", "FOIL"], [
      { variant: "FOIL", physicalFinish: "NORMAL", quantity: 2 },
      { variant: "NORMAL", physicalFinish: "FOIL", quantity: 1 },
    ]);

    expect(counts).toEqual({ NORMAL: 2, FOIL: 1 });
  });

  it("falls back to legacy normal and foil variants when physicalFinish is null", () => {
    const counts = createOwnedVariantCounts("card-1", ["NORMAL", "FOIL"], [
      { variant: "NORMAL", physicalFinish: null, quantity: 2 },
      { variant: "FOIL", physicalFinish: null, quantity: 1 },
    ]);

    expect(counts).toEqual({ NORMAL: 2, FOIL: 1 });
  });

  it("does not convert legacy showcase compatibility rows into normal or foil ownership", () => {
    const counts = createOwnedVariantCounts("card-1", ["NORMAL", "FOIL"], [
      { variant: "SHOWCASE", physicalFinish: null, quantity: 5 },
    ]);

    expect(counts).toEqual({});
  });

  it("converts positive valid entries into VariantCounts", () => {
    const counts = createOwnedVariantCounts("card-1", ["NORMAL", "FOIL"], [
      { variant: "NORMAL", quantity: 2 },
      { variant: "FOIL", quantity: 1 },
    ]);

    expect(counts).toEqual({ NORMAL: 2, FOIL: 1 });
  });

  it("omits zero entries from returned VariantCounts", () => {
    const counts = createOwnedVariantCounts("card-1", ["NORMAL", "FOIL"], [
      { variant: "NORMAL", quantity: 0 },
      { variant: "FOIL", quantity: 3 },
    ]);

    expect(counts).toEqual({ FOIL: 3 });
    expect(getVariantCount(counts, "NORMAL")).toBe(0);
  });


  it("aggregates same variant rows when physical card languages are selected", () => {
    const counts = createOwnedVariantCounts("card-1", ["NORMAL", "FOIL"], [
      { variant: "NORMAL", physicalFinish: "NORMAL", cardLanguage: "FR", quantity: 1 },
      { variant: "NORMAL", physicalFinish: "NORMAL", cardLanguage: "EN", quantity: 2 },
      { variant: "NORMAL", physicalFinish: "NORMAL", cardLanguage: "ZH", quantity: 3 },
    ]);

    expect(counts).toEqual({ NORMAL: 6 });
  });

  it("keeps legacy UNKNOWN language rows in the same language-agnostic aggregate", () => {
    const counts = createOwnedVariantCounts("card-1", ["NORMAL", "FOIL"], [
      { variant: "NORMAL", physicalFinish: "NORMAL", cardLanguage: "UNKNOWN", quantity: 2 },
      { variant: "NORMAL", physicalFinish: "NORMAL", cardLanguage: "FR", quantity: 1 },
    ]);

    expect(counts).toEqual({ NORMAL: 3 });
  });

  it("throws before aggregation when a negative language row would otherwise be masked", () => {
    expect(() =>
      createOwnedVariantCounts("card-1", ["NORMAL", "FOIL"], [
        { variant: "NORMAL", physicalFinish: "NORMAL", cardLanguage: "FR", quantity: -1 },
        { variant: "NORMAL", physicalFinish: "NORMAL", cardLanguage: "EN", quantity: 3 },
      ]),
    ).toThrow("Invalid negative CollectionEntry quantity for card card-1 variant NORMAL");
  });

  it("throws the existing negative CollectionEntry error for negative quantities", () => {
    expect(() =>
      createOwnedVariantCounts("card-1", ["NORMAL", "FOIL"], [{ variant: "FOIL", quantity: -1 }]),
    ).toThrow("Invalid negative CollectionEntry quantity for card card-1 variant FOIL");
  });

  it("throws a clear error for duplicate snapshot rows for the same variant", () => {
    expect(() =>
      createOwnedVariantCounts("card-1", ["NORMAL", "FOIL"], [
        { variant: "NORMAL", quantity: 1 },
        { variant: "NORMAL", quantity: 2 },
      ]),
    ).toThrow("Duplicate CollectionEntry snapshot for card card-1 variant NORMAL");
  });
});
