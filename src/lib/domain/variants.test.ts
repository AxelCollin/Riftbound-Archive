import { describe, expect, it } from "vitest";

import { type RiftboundCard } from "./cards";
import { PHYSICAL_FINISHES, isPhysicalFinish, mapLegacyCardVariantToPhysicalFinish } from "./physical-finishes";
import { getAllowedVariants, isShowcaseVariant, supportsNormalVariant } from "./variants";

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

  it("keeps legacy showcase compatibility for standard cards with showcase support", () => {
    expect(getAllowedVariants({ ...gameplayCard, rarity: "RARE", collectorCategory: "STANDARD", hasShowcase: true })).toEqual(["FOIL", "SHOWCASE"]);
  });

  it("keeps legacy showcase display compatibility out of the physical finish axis", () => {
    const allowedVariants = getAllowedVariants({ ...gameplayCard, rarity: "RARE", collectorCategory: "STANDARD", hasShowcase: true });

    expect(allowedVariants).toEqual(["FOIL", "SHOWCASE"]);
    expect(isShowcaseVariant("SHOWCASE")).toBe(true);
    expect(PHYSICAL_FINISHES).toEqual(["NORMAL", "FOIL"]);
    expect(isPhysicalFinish("SHOWCASE")).toBe(false);
    expect(mapLegacyCardVariantToPhysicalFinish("SHOWCASE")).toBeNull();
  });

  it("does not expose the legacy showcase variant for showcase collector printings", () => {
    expect(getAllowedVariants({ ...gameplayCard, rarity: "RARE", collectorCategory: "SHOWCASE", hasShowcase: true })).toEqual(["FOIL"]);
    expect(getAllowedVariants({ ...gameplayCard, rarity: "COMMON", collectorCategory: "SHOWCASE", hasShowcase: true })).toEqual(["NORMAL", "FOIL"]);
  });

  it("returns no variants for ignored tokens and rules cards", () => {
    expect(getAllowedVariants({ ...gameplayCard, kind: "TOKEN", rarity: "COMMON", hasShowcase: true })).toEqual([]);
    expect(getAllowedVariants({ ...gameplayCard, kind: "RULES", rarity: "COMMON", hasShowcase: true })).toEqual([]);
  });
});
