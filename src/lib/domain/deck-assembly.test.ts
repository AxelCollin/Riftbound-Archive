import { describe, expect, it } from "vitest";

import { planAssembledDeckAllocations } from "./deck-assembly";

const common = { id: "common", kind: "GAMEPLAY", rarity: "COMMON", hasShowcase: true } as const;
const rare = { id: "rare", kind: "GAMEPLAY", rarity: "RARE", hasShowcase: true } as const;
const token = { id: "token", kind: "TOKEN", rarity: "COMMON", hasShowcase: false } as const;

function plan(requirements: Parameters<typeof planAssembledDeckAllocations>[0], available: Parameters<typeof planAssembledDeckAllocations>[1], cards = [common, rare]) {
  return planAssembledDeckAllocations(requirements, available, cards);
}

describe("planAssembledDeckAllocations", () => {
  it("satisfies exact variant requirements before ANY for the same card", () => {
    expect(plan([
      { cardId: "common", quantity: 1, preferredVariant: "ANY" },
      { cardId: "common", quantity: 1, preferredVariant: "FOIL" },
    ], [{ cardId: "common", available: { NORMAL: 1, FOIL: 1 } }])).toEqual({
      ok: true,
      allocations: [
        { cardId: "common", variant: "FOIL", quantity: 1 },
        { cardId: "common", variant: "NORMAL", quantity: 1 },
      ],
    });
  });

  it("uses preserve-premium order for ANY requirements", () => {
    expect(plan([{ cardId: "common", quantity: 3, preferredVariant: "ANY" }], [{ cardId: "common", available: { NORMAL: 1, FOIL: 1, SHOWCASE: 1 } }])).toEqual({
      ok: true,
      allocations: [
        { cardId: "common", variant: "NORMAL", quantity: 1 },
        { cardId: "common", variant: "FOIL", quantity: 1 },
        { cardId: "common", variant: "SHOWCASE", quantity: 1 },
      ],
    });
  });

  it("uses foil before showcase for foil-only rarity ANY requirements", () => {
    expect(plan([{ cardId: "rare", quantity: 2, preferredVariant: "ANY" }], [{ cardId: "rare", available: { FOIL: 1, SHOWCASE: 1 } }])).toEqual({
      ok: true,
      allocations: [
        { cardId: "rare", variant: "FOIL", quantity: 1 },
        { cardId: "rare", variant: "SHOWCASE", quantity: 1 },
      ],
    });
  });

  it("does not allocate copies removed from availability by binder reservations or other assembled decks", () => {
    expect(plan([{ cardId: "common", quantity: 2, preferredVariant: "ANY" }], [{ cardId: "common", available: { NORMAL: 1 } }])).toEqual({
      ok: false,
      error: "Insufficient availability for card common: missing 1 copy/copies.",
      allocations: [],
    });
  });

  it("allows theoretical deck copies when they are not removed from availability", () => {
    expect(plan([{ cardId: "common", quantity: 2, preferredVariant: "ANY" }], [{ cardId: "common", available: { NORMAL: 2 } }])).toEqual({
      ok: true,
      allocations: [{ cardId: "common", variant: "NORMAL", quantity: 2 }],
    });
  });

  it("rejects TOKEN and RULES cards", () => {
    expect(planAssembledDeckAllocations([{ cardId: "token", quantity: 1, preferredVariant: "ANY" }], [{ cardId: "token", available: { NORMAL: 1 } }], [token])).toEqual({
      ok: false,
      error: "Card token is not trackable for deck allocation.",
      allocations: [],
    });
  });

  it("does not let one owned copy satisfy multiple requirements", () => {
    expect(plan([
      { cardId: "common", quantity: 1, preferredVariant: "NORMAL" },
      { cardId: "common", quantity: 1, preferredVariant: "ANY" },
    ], [{ cardId: "common", available: { NORMAL: 1 } }])).toEqual({
      ok: false,
      error: "Insufficient availability for card common: missing 1 copy/copies.",
      allocations: [],
    });
  });
});
