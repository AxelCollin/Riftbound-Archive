import { describe, expect, it } from "vitest";

import { isTrackableCard, type RiftboundCard } from "./cards";

const baseCard = {
  id: "card-1",
  name: "Riftbound Card",
  rarity: "COMMON",
} satisfies Omit<RiftboundCard, "kind">;

describe("isTrackableCard", () => {
  it("tracks gameplay and Energy cards for Riftbound collection management", () => {
    expect(isTrackableCard({ ...baseCard, kind: "GAMEPLAY" })).toBe(true);
    expect(isTrackableCard({ ...baseCard, kind: "ENERGY" })).toBe(true);
  });

  it("ignores tokens and rules cards", () => {
    expect(isTrackableCard({ ...baseCard, kind: "TOKEN" })).toBe(false);
    expect(isTrackableCard({ ...baseCard, kind: "RULES" })).toBe(false);
  });
});
