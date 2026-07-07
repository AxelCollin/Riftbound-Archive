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

  it("returns zero from the UI-safe helper when over-reservation would make raw availability negative", () => {
    expect(getAvailableCount(1, 3, 0)).toBe(0);
  });

  it("returns zero from the UI-safe helper when over-allocation would make raw availability negative", () => {
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

  it("falls back to legacy NORMAL and FOIL allocation variants when physicalFinish is null", () => {
    expect(
      getCardAvailability(
        { ...card, rarity: "COMMON" },
        { NORMAL: 3, FOIL: 2 },
        [{ assembled: true, allocations: [
          { cardId: "card-1", variant: "NORMAL", physicalFinish: null, quantity: 1 },
          { cardId: "card-1", variant: "FOIL", physicalFinish: null, quantity: 1 },
        ] }],
        {},
      ).available,
    ).toEqual({ NORMAL: 2, FOIL: 1 });
  });

  it("prefers physicalFinish over legacy variant for deck allocations", () => {
    expect(
      getCardAvailability(
        { ...card, rarity: "COMMON" },
        { NORMAL: 2, FOIL: 2 },
        [{ assembled: true, allocations: [{ cardId: "card-1", variant: "SHOWCASE", physicalFinish: "FOIL", quantity: 2 }] }],
        {},
      ).available,
    ).toEqual({ NORMAL: 2 });
  });

  it("does not map legacy SHOWCASE allocation rows without physicalFinish to normal or foil", () => {
    expect(
      getCardAvailability(
        { ...card, rarity: "COMMON" },
        { NORMAL: 2, FOIL: 2 },
        [{ assembled: true, allocations: [{ cardId: "card-1", variant: "SHOWCASE", physicalFinish: null, quantity: 2 }] }],
        {},
      ).available,
    ).toEqual({ NORMAL: 2, FOIL: 2 });
  });

  it("ignores tokens and rules cards in availability calculations", () => {
    expect(getCardAvailability({ ...card, kind: "TOKEN", rarity: "COMMON" }, { NORMAL: 2 }).available).toEqual({});
    expect(getCardAvailability({ ...card, kind: "RULES", rarity: "COMMON" }, { FOIL: 2 }).available).toEqual({});
  });

  it("ignores owned counts for variants unsupported by the card", () => {
    expect(getCardAvailability({ ...card, rarity: "RARE" }, { NORMAL: 2, FOIL: 2 }).available).toEqual({
      FOIL: 1,
    });
  });

  it("only reports showcase availability when the card has a showcase variant", () => {
    expect(getCardAvailability({ ...card, rarity: "RARE" }, { FOIL: 1, SHOWCASE: 1 }).available).toEqual({});
    expect(getCardAvailability({ ...card, rarity: "RARE", hasShowcase: true }, { FOIL: 1, SHOWCASE: 1 }).available).toEqual({
      SHOWCASE: 1,
    });
  });
});
