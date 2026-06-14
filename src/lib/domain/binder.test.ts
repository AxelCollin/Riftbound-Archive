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

  it("does not reserve ignored tokens or rules cards", () => {
    expect(getBinderReservation({ ...card, kind: "TOKEN", rarity: "COMMON" }, { FOIL: 1 }).reserved).toEqual({});
    expect(getBinderReservation({ ...card, kind: "RULES", rarity: "COMMON" }, { NORMAL: 1 }).reserved).toEqual({});
  });
});
