import { describe, expect, it } from "vitest";

import { getCollectionEntryQuantityDelta, getNextCollectionEntryQuantity } from "./collection";

describe("collection snapshot quantity rules", () => {
  it("returns signed atomic deltas for delta transaction types", () => {
    expect(getCollectionEntryQuantityDelta({ type: "ADD", quantity: 2 })).toBe(2);
    expect(getCollectionEntryQuantityDelta({ type: "REMOVE", quantity: 2 })).toBe(-2);
    expect(getCollectionEntryQuantityDelta({ type: "ADJUST", quantity: 2 })).toBe(2);
    expect(getCollectionEntryQuantityDelta({ type: "ADJUST", quantity: -2 })).toBe(-2);
  });

  it("returns no delta for absolute SET transactions", () => {
    expect(getCollectionEntryQuantityDelta({ type: "SET", quantity: 4 })).toBeNull();
  });

  it("adds ADD transaction quantity to the current snapshot quantity", () => {
    expect(getNextCollectionEntryQuantity(3, { type: "ADD", quantity: 2 })).toBe(5);
  });

  it("subtracts REMOVE transaction quantity from the current snapshot quantity", () => {
    expect(getNextCollectionEntryQuantity(3, { type: "REMOVE", quantity: 2 })).toBe(1);
  });

  it("replaces the current snapshot quantity for SET transactions", () => {
    expect(getNextCollectionEntryQuantity(3, { type: "SET", quantity: 4 })).toBe(4);
    expect(getNextCollectionEntryQuantity(3, { type: "SET", quantity: 0 })).toBe(0);
  });

  it("applies ADJUST transaction quantity as a signed delta", () => {
    expect(getNextCollectionEntryQuantity(3, { type: "ADJUST", quantity: 2 })).toBe(5);
    expect(getNextCollectionEntryQuantity(3, { type: "ADJUST", quantity: -2 })).toBe(1);
  });

  it("rejects any transaction result that would make the snapshot quantity negative", () => {
    expect(() => getNextCollectionEntryQuantity(1, { type: "REMOVE", quantity: 2 })).toThrow(RangeError);
    expect(() => getNextCollectionEntryQuantity(1, { type: "ADJUST", quantity: -2 })).toThrow(RangeError);
  });
});
