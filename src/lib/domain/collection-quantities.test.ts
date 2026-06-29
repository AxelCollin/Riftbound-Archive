import { describe, expect, it } from "vitest";
import { normalizeOwnedSnapshotQuantity } from "./collection-quantities";

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
