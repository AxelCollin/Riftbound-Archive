import { describe, expect, it } from "vitest";
import { calculateDeckMissingCards } from "./deck-missing";
import type { DeckCardAvailabilityInput } from "./deck-missing";
import type { DeckRequirementInput } from "./decks";

describe("calculateDeckMissingCards", () => {
  it("uses only normal cards for exact NORMAL requirements", () => {
    expect(
      rowFor(
        [{ cardId: "card-1", quantity: 2, preferredVariant: "NORMAL" }],
        [{ cardId: "card-1", available: { NORMAL: 1, FOIL: 5 } }],
      ),
    ).toMatchObject({
      satisfiedQuantity: 1,
      missingQuantity: 1,
      usedVariants: { NORMAL: 1 },
    });
  });

  it("uses only foil cards for exact FOIL requirements", () => {
    expect(
      rowFor(
        [{ cardId: "card-1", quantity: 2, preferredVariant: "FOIL" }],
        [{ cardId: "card-1", available: { NORMAL: 5, FOIL: 2 } }],
      ),
    ).toMatchObject({
      satisfiedQuantity: 2,
      missingQuantity: 0,
      usedVariants: { FOIL: 2 },
    });
  });

  it("uses only showcase cards for exact SHOWCASE requirements", () => {
    expect(
      rowFor(
        [{ cardId: "card-1", quantity: 2, preferredVariant: "SHOWCASE" }],
        [{ cardId: "card-1", available: { FOIL: 5, SHOWCASE: 1 } }],
      ),
    ).toMatchObject({
      satisfiedQuantity: 1,
      missingQuantity: 1,
      usedVariants: { SHOWCASE: 1 },
    });
  });

  it("uses normal first, foil second, and showcase last for ANY requirements", () => {
    expect(
      rowFor(
        [{ cardId: "card-1", quantity: 5, preferredVariant: "ANY" }],
        [{ cardId: "card-1", available: { NORMAL: 2, FOIL: 2, SHOWCASE: 2 } }],
      ),
    ).toMatchObject({
      satisfiedQuantity: 5,
      missingQuantity: 0,
      usedVariants: { NORMAL: 2, FOIL: 2, SHOWCASE: 1 },
    });
  });

  it("preserves premium variants when normal availability is enough for ANY", () => {
    expect(
      rowFor(
        [{ cardId: "card-1", quantity: 2, preferredVariant: "ANY" }],
        [{ cardId: "card-1", available: { NORMAL: 3, FOIL: 2, SHOWCASE: 1 } }],
      ),
    ).toMatchObject({
      usedVariants: { NORMAL: 2 },
    });
  });

  it("reports missing quantity when availability is insufficient", () => {
    expect(
      rowFor(
        [{ cardId: "card-1", quantity: 4, preferredVariant: "ANY" }],
        [{ cardId: "card-1", available: { NORMAL: 1, FOIL: 1 } }],
      ),
    ).toMatchObject({
      satisfiedQuantity: 2,
      missingQuantity: 2,
    });
  });

  it("reports no missing quantity when availability is enough", () => {
    expect(
      rowFor(
        [{ cardId: "card-1", quantity: 2, preferredVariant: "ANY" }],
        [{ cardId: "card-1", available: { NORMAL: 2 } }],
      ),
    ).toMatchObject({
      satisfiedQuantity: 2,
      missingQuantity: 0,
    });
  });

  it("reports all copies missing when the card has no availability entry", () => {
    expect(
      rowFor([{ cardId: "card-1", quantity: 3, preferredVariant: "ANY" }], []),
    ).toMatchObject({
      satisfiedQuantity: 0,
      missingQuantity: 3,
      usedVariants: {},
    });
  });

  it("does not mutate input availability", () => {
    const availability: DeckCardAvailabilityInput[] = [
      { cardId: "card-1", available: { NORMAL: 2, FOIL: 1 } },
    ];

    calculateDeckMissingCards(
      [{ cardId: "card-1", quantity: 2, preferredVariant: "ANY" }],
      availability,
    );

    expect(availability).toEqual([
      { cardId: "card-1", available: { NORMAL: 2, FOIL: 1 } },
    ]);
  });

  it("satisfies exact requirements before ANY requirements for the same card", () => {
    const rows = calculateDeckMissingCards(
      [
        { cardId: "card-1", quantity: 2, preferredVariant: "ANY" },
        { cardId: "card-1", quantity: 1, preferredVariant: "FOIL" },
      ],
      [{ cardId: "card-1", available: { NORMAL: 1, FOIL: 1 } }],
    );

    expect(rows).toEqual([
      expect.objectContaining({
        preferredVariant: "ANY",
        satisfiedQuantity: 1,
        missingQuantity: 1,
        usedVariants: { NORMAL: 1 },
      }),
      expect.objectContaining({
        preferredVariant: "FOIL",
        satisfiedQuantity: 1,
        missingQuantity: 0,
        usedVariants: { FOIL: 1 },
      }),
    ]);
  });

  it("does not double-spend copies across multiple requirements for the same card", () => {
    const rows = calculateDeckMissingCards(
      [
        { cardId: "card-1", quantity: 1, preferredVariant: "NORMAL" },
        { cardId: "card-1", quantity: 2, preferredVariant: "ANY" },
      ],
      [{ cardId: "card-1", available: { NORMAL: 2 } }],
    );

    expect(rows).toEqual([
      expect.objectContaining({
        preferredVariant: "NORMAL",
        satisfiedQuantity: 1,
        missingQuantity: 0,
      }),
      expect.objectContaining({
        preferredVariant: "ANY",
        satisfiedQuantity: 1,
        missingQuantity: 1,
      }),
    ]);
  });

  it("calculates multiple cards independently", () => {
    const rows = calculateDeckMissingCards(
      [
        { cardId: "card-1", quantity: 1, preferredVariant: "ANY" },
        { cardId: "card-2", quantity: 2, preferredVariant: "ANY" },
      ],
      [
        { cardId: "card-1", available: { NORMAL: 1 } },
        { cardId: "card-2", available: { FOIL: 1 } },
      ],
    );

    expect(rows).toEqual([
      expect.objectContaining({
        cardId: "card-1",
        satisfiedQuantity: 1,
        missingQuantity: 0,
      }),
      expect.objectContaining({
        cardId: "card-2",
        satisfiedQuantity: 1,
        missingQuantity: 1,
      }),
    ]);
  });

  it("treats zero-count variants as unavailable", () => {
    expect(
      rowFor(
        [{ cardId: "card-1", quantity: 1, preferredVariant: "ANY" }],
        [{ cardId: "card-1", available: { NORMAL: 0, FOIL: 0, SHOWCASE: 0 } }],
      ),
    ).toMatchObject({
      satisfiedQuantity: 0,
      missingQuantity: 1,
      usedVariants: {},
    });
  });
});

function rowFor(
  requirements: DeckRequirementInput[],
  availabilityByCard: DeckCardAvailabilityInput[],
) {
  return calculateDeckMissingCards(requirements, availabilityByCard)[0];
}
