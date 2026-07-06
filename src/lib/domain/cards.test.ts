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

  it("keeps compatibility for Energy and Rune cards", () => {
    expect(isTrackableCard({ ...baseCard, kind: "ENERGY" })).toBe(true);
    expect(isTrackableCard({ ...baseCard, kind: "GAMEPLAY", gameplayType: "RUNE" })).toBe(true);
  });

  it("uses richer gameplay type data to ignore Token and Rules cards when present", () => {
    expect(isTrackableCard({ ...baseCard, kind: "GAMEPLAY", gameplayType: "TOKEN" })).toBe(false);
    expect(isTrackableCard({ ...baseCard, kind: "GAMEPLAY", gameplayType: "RULES" })).toBe(false);
  });

  it("falls back to existing kind when gameplay type is unknown", () => {
    expect(isTrackableCard({ ...baseCard, kind: "ENERGY", gameplayType: "UNKNOWN" })).toBe(true);
    expect(isTrackableCard({ ...baseCard, kind: "TOKEN", gameplayType: "UNKNOWN" })).toBe(false);
  });
});
