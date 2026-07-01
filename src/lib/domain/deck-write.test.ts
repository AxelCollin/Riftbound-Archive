import { describe, expect, it } from "vitest";

import { DECK_NAME_MAX_LENGTH, normalizeDeckMetadataInput } from "./deck-write";

const validInput = {
  name: "Deck Alpha",
  allocationStrategy: "PRESERVE_PREMIUM_VARIANTS" as const,
};

describe("normalizeDeckMetadataInput", () => {
  it("trims deck name", () => {
    expect(normalizeDeckMetadataInput({ ...validInput, name: "  Deck Alpha  " }).name).toBe("Deck Alpha");
  });

  it("rejects empty deck name", () => {
    expect(() => normalizeDeckMetadataInput({ ...validInput, name: "   " })).toThrow("Deck name is required.");
  });

  it("rejects too-long deck name", () => {
    expect(() => normalizeDeckMetadataInput({ ...validInput, name: "A".repeat(DECK_NAME_MAX_LENGTH + 1) })).toThrow(
      `Deck name must be ${DECK_NAME_MAX_LENGTH} characters or fewer.`,
    );
  });

  it("trims description", () => {
    expect(normalizeDeckMetadataInput({ ...validInput, description: "  Description test  " }).description).toBe("Description test");
  });

  it("converts empty description to null", () => {
    expect(normalizeDeckMetadataInput({ ...validInput, description: "   " }).description).toBeNull();
  });

  it("validates allocation strategy", () => {
    expect(() =>
      normalizeDeckMetadataInput({ ...validInput, allocationStrategy: "UNKNOWN" as typeof validInput.allocationStrategy }),
    ).toThrow("Deck allocation strategy must be one of PRESERVE_PREMIUM_VARIANTS, EXACT_VARIANT, or ANY_VARIANT.");
  });

  it("defaults allocation strategy when missing", () => {
    expect(normalizeDeckMetadataInput({ name: "Deck Alpha" }).allocationStrategy).toBe("PRESERVE_PREMIUM_VARIANTS");
  });
});
