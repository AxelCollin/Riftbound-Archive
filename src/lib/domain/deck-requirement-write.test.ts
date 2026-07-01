import { describe, expect, it } from "vitest";

import { normalizeDeckRequirementWriteInput } from "./deck-requirement-write";

const validInput = { cardId: "card-1", quantity: 2, preferredVariant: "ANY" as const };

describe("normalizeDeckRequirementWriteInput", () => {
  it("trims cardId", () => {
    expect(normalizeDeckRequirementWriteInput({ ...validInput, cardId: "  card-1  " })).toEqual(validInput);
  });

  it("rejects empty cardId", () => {
    expect(() => normalizeDeckRequirementWriteInput({ ...validInput, cardId: "  " })).toThrow("cardId is required");
  });

  it("rejects quantity 0", () => {
    expect(() => normalizeDeckRequirementWriteInput({ ...validInput, quantity: 0 })).toThrow("positive integer");
  });

  it("rejects negative quantity", () => {
    expect(() => normalizeDeckRequirementWriteInput({ ...validInput, quantity: -1 })).toThrow("positive integer");
  });

  it("rejects non-integer quantity", () => {
    expect(() => normalizeDeckRequirementWriteInput({ ...validInput, quantity: 1.5 })).toThrow("positive integer");
  });

  it("validates known preferredVariant values", () => {
    expect(normalizeDeckRequirementWriteInput({ ...validInput, preferredVariant: "NORMAL" })).toMatchObject({ preferredVariant: "NORMAL" });
    expect(normalizeDeckRequirementWriteInput({ ...validInput, preferredVariant: "FOIL" })).toMatchObject({ preferredVariant: "FOIL" });
    expect(normalizeDeckRequirementWriteInput({ ...validInput, preferredVariant: "SHOWCASE" })).toMatchObject({ preferredVariant: "SHOWCASE" });
  });

  it("rejects unknown runtime preferredVariant values", () => {
    expect(() => normalizeDeckRequirementWriteInput({ ...validInput, preferredVariant: "ETCHED" as never })).toThrow("ANY, NORMAL, FOIL, or SHOWCASE");
  });
});
