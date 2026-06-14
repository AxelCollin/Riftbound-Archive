import { describe, expect, it } from "vitest";

import { getAvailableCount, getCardAvailability } from "./availability";
import { type RiftboundCard } from "./cards";

const card = {
  id: "card-1",
  name: "Riftbound Card",
  kind: "GAMEPLAY",
} satisfies Omit<RiftboundCard, "rarity">;

describe("availability rules", () => {
  it("uses owned minus binder reserved minus assembled deck allocation", () => {
    expect(getAvailableCount(4, 1, 2)).toBe(1);
  });

  it("never returns availability below zero", () => {
    expect(getAvailableCount(1, 1, 5)).toBe(0);
  });

  it("computes available quantities per card and per variant", () => {
    expect(
      getCardAvailability(
        { ...card, rarity: "COMMON" },
        { NORMAL: 3, FOIL: 1 },
        [{ assembled: true, allocations: [{ cardId: "card-1", variant: "NORMAL", quantity: 2 }] }],
      ).available,
    ).toEqual({ NORMAL: 1 });
  });

  it("does not let theoretical non-assembled decks block availability", () => {
    expect(
      getCardAvailability(
        { ...card, rarity: "COMMON" },
        { NORMAL: 3 },
        [{ assembled: false, allocations: [{ cardId: "card-1", variant: "NORMAL", quantity: 2 }] }],
      ).available,
    ).toEqual({ NORMAL: 2 });
  });

  it("lets assembled decks allocate real cards and block them globally", () => {
    expect(
      getCardAvailability(
        { ...card, rarity: "COMMON" },
        { NORMAL: 4 },
        [
          { assembled: true, allocations: [{ cardId: "card-1", variant: "NORMAL", quantity: 2 }] },
          { assembled: true, allocations: [{ cardId: "card-1", variant: "NORMAL", quantity: 1 }] },
        ],
      ).available,
    ).toEqual({});
  });

  it("ignores tokens and rules cards in availability calculations", () => {
    expect(getCardAvailability({ ...card, kind: "TOKEN", rarity: "COMMON" }, { NORMAL: 2 }).available).toEqual({});
    expect(getCardAvailability({ ...card, kind: "RULES", rarity: "COMMON" }, { FOIL: 2 }).available).toEqual({});
  });

  it("keeps showcase availability separate from binder-reserved regular foils", () => {
    expect(getCardAvailability({ ...card, rarity: "RARE" }, { FOIL: 1, SHOWCASE: 1 }).available).toEqual({
      SHOWCASE: 1,
    });
  });
});
