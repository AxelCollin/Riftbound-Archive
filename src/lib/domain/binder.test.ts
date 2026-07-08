import { describe, expect, it } from "vitest";

import { type RiftboundCard } from "./cards";
import { getBinderReservation } from "./binder";

const card = {
  id: "card-1",
  name: "Riftbound Card",
  kind: "GAMEPLAY",
} satisfies Omit<RiftboundCard, "rarity">;

describe("getBinderReservation", () => {
  it("reserves one normal copy for a trackable common with no foil owned", () => {
    expect(getBinderReservation({ ...card, rarity: "COMMON" }, { NORMAL: 3 }).reserved).toEqual({ NORMAL: 1 });
  });

  it("prefers one regular foil copy over normal copies", () => {
    expect(getBinderReservation({ ...card, rarity: "COMMON" }, { NORMAL: 3, FOIL: 1 }).reserved).toEqual({ FOIL: 1 });
  });

  it("reserves one foil copy for foil-only rarities", () => {
    expect(getBinderReservation({ ...card, rarity: "RARE" }, { FOIL: 2 }).reserved).toEqual({ FOIL: 1 });
  });

  it("never auto-reserves showcase variants", () => {
    expect(getBinderReservation({ ...card, rarity: "RARE" }, { SHOWCASE: 1 }).reserved).toEqual({});
    expect(getBinderReservation({ ...card, rarity: "RARE" }, { FOIL: 1, SHOWCASE: 1 }).reserved).toEqual({ FOIL: 1 });
  });


  it("does not auto-reserve showcase printed cards with normal or foil owned", () => {
    const showcaseCard = { ...card, rarity: "COMMON", collectorCategory: "SHOWCASE" } as const;

    expect(getBinderReservation(showcaseCard, { NORMAL: 2 }).reserved).toEqual({});
    expect(getBinderReservation(showcaseCard, { FOIL: 1 }).reserved).toEqual({});
    expect(getBinderReservation(showcaseCard, { NORMAL: 2, FOIL: 1 }).reserved).toEqual({});
  });


  it("prefers BinderOverride physicalFinish over legacy variant", () => {
    expect(getBinderReservation(
      { ...card, rarity: "COMMON" },
      { NORMAL: 2, FOIL: 2 },
      { mode: "FORCE_VARIANT", variant: "NORMAL", physicalFinish: "FOIL", quantity: 1 },
    ).reserved).toEqual({ FOIL: 1 });
  });

  it("falls back from legacy NORMAL and FOIL BinderOverride rows when physicalFinish is null", () => {
    expect(getBinderReservation(
      { ...card, rarity: "COMMON" },
      { NORMAL: 2, FOIL: 2 },
      { mode: "FORCE_VARIANT", variant: "NORMAL", physicalFinish: null, quantity: 1 },
    ).reserved).toEqual({ NORMAL: 1 });

    expect(getBinderReservation(
      { ...card, rarity: "COMMON" },
      { NORMAL: 2, FOIL: 2 },
      { mode: "FORCE_VARIANT", variant: "FOIL", physicalFinish: null, quantity: 1 },
    ).reserved).toEqual({ FOIL: 1 });
  });

  it("does not turn legacy SHOWCASE BinderOverride rows into physical finish reservations", () => {
    expect(getBinderReservation(
      { ...card, rarity: "COMMON", hasShowcase: true },
      { NORMAL: 2, FOIL: 2, SHOWCASE: 1 },
      { mode: "FORCE_VARIANT", variant: "SHOWCASE", physicalFinish: null, quantity: 1 },
    ).reserved).toEqual({});
  });

  it("preserves disabled BinderOverride behavior", () => {
    expect(getBinderReservation(
      { ...card, rarity: "COMMON" },
      { NORMAL: 2, FOIL: 1 },
      { mode: "DISABLED", variant: "FOIL", physicalFinish: "FOIL", quantity: 1 },
    ).reserved).toEqual({});
  });

  it("does not reserve ignored tokens or rules cards", () => {
    expect(getBinderReservation({ ...card, kind: "TOKEN", rarity: "COMMON" }, { FOIL: 1 }).reserved).toEqual({});
    expect(getBinderReservation({ ...card, kind: "RULES", rarity: "COMMON" }, { NORMAL: 1 }).reserved).toEqual({});
  });
});
