import { describe, expect, it } from "vitest";

import { type RiftboundCard } from "./cards";
import { getAllowedVariants, supportsNormalVariant } from "./variants";

const gameplayCard = {
  id: "card-1",
  name: "Riftbound Card",
  kind: "GAMEPLAY",
} satisfies Omit<RiftboundCard, "rarity">;

describe("variant rules", () => {
  it("allows Commons and Uncommons to exist as normal and foil variants", () => {
    expect(getAllowedVariants({ ...gameplayCard, rarity: "COMMON" })).toEqual(["NORMAL", "FOIL"]);
    expect(getAllowedVariants({ ...gameplayCard, rarity: "UNCOMMON" })).toEqual(["NORMAL", "FOIL"]);
    expect(supportsNormalVariant({ ...gameplayCard, rarity: "COMMON" })).toBe(true);
  });

  it("treats other rarities as foil-only by default", () => {
    expect(getAllowedVariants({ ...gameplayCard, rarity: "RARE" })).toEqual(["FOIL"]);
    expect(getAllowedVariants({ ...gameplayCard, rarity: "EPIC" })).toEqual(["FOIL"]);
    expect(getAllowedVariants({ ...gameplayCard, rarity: "ULTIMATE" })).toEqual(["FOIL"]);
    expect(getAllowedVariants({ ...gameplayCard, rarity: "UNKNOWN" })).toEqual(["FOIL"]);
    expect(supportsNormalVariant({ ...gameplayCard, rarity: "RARE" })).toBe(false);
    expect(supportsNormalVariant({ ...gameplayCard, rarity: "ULTIMATE" })).toBe(false);
    expect(supportsNormalVariant({ ...gameplayCard, rarity: "UNKNOWN" })).toBe(false);
  });

  it("tracks one showcase variant separately from regular foil when present", () => {
    expect(getAllowedVariants({ ...gameplayCard, rarity: "RARE", hasShowcase: true })).toEqual(["FOIL", "SHOWCASE"]);
  });

  it("returns no variants for ignored tokens and rules cards", () => {
    expect(getAllowedVariants({ ...gameplayCard, kind: "TOKEN", rarity: "COMMON" })).toEqual([]);
    expect(getAllowedVariants({ ...gameplayCard, kind: "RULES", rarity: "COMMON" })).toEqual([]);
  });
});
