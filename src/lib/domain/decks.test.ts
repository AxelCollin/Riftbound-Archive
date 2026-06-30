import { describe, expect, it } from "vitest";
import { getDeckRequirementKey, normalizeDeckRequirements } from "./decks";
import type { DeckRequirementInput } from "./decks";

describe("normalizeDeckRequirements", () => {
  it("passes valid requirements through", () => {
    const requirements: DeckRequirementInput[] = [
      { cardId: "card-1", quantity: 2, preferredVariant: "NORMAL" },
    ];

    expect(normalizeDeckRequirements(requirements)).toEqual(requirements);
  });

  it("merges duplicate same card and same preference rows", () => {
    expect(
      normalizeDeckRequirements([
        { cardId: "card-1", quantity: 2, preferredVariant: "FOIL" },
        { cardId: "card-1", quantity: 3, preferredVariant: "FOIL" },
      ]),
    ).toEqual([{ cardId: "card-1", quantity: 5, preferredVariant: "FOIL" }]);
  });

  it("keeps same card with different preferences separate", () => {
    expect(
      normalizeDeckRequirements([
        { cardId: "card-1", quantity: 1, preferredVariant: "NORMAL" },
        { cardId: "card-1", quantity: 1, preferredVariant: "ANY" },
      ]),
    ).toEqual([
      { cardId: "card-1", quantity: 1, preferredVariant: "NORMAL" },
      { cardId: "card-1", quantity: 1, preferredVariant: "ANY" },
    ]);
  });

  it("throws for quantity 0", () => {
    expect(() =>
      normalizeDeckRequirements([
        { cardId: "card-1", quantity: 0, preferredVariant: "ANY" },
      ]),
    ).toThrow("positive integer");
  });

  it("throws for negative quantity", () => {
    expect(() =>
      normalizeDeckRequirements([
        { cardId: "card-1", quantity: -1, preferredVariant: "ANY" },
      ]),
    ).toThrow("positive integer");
  });

  it("throws for empty card id", () => {
    expect(() =>
      normalizeDeckRequirements([
        { cardId: " ", quantity: 1, preferredVariant: "ANY" },
      ]),
    ).toThrow("cardId must not be empty");
  });

  it("throws for invalid preferred variant from runtime input", () => {
    expect(() =>
      normalizeDeckRequirements([
        {
          cardId: "card-1",
          quantity: 1,
          preferredVariant:
            "ETCHED" as DeckRequirementInput["preferredVariant"],
        },
      ]),
    ).toThrow("preferredVariant");
  });
});

describe("getDeckRequirementKey", () => {
  it("returns a deterministic key", () => {
    expect(
      getDeckRequirementKey({ cardId: "card-1", preferredVariant: "SHOWCASE" }),
    ).toBe("card-1::SHOWCASE");
  });
});
