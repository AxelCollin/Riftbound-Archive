import { describe, expect, it } from "vitest";

import {
  areGameplayEquivalent,
  CARD_GAMEPLAY_RARITIES,
  getGameplayIdentityKey,
  getRelatedPrintings,
  isCollectorCard,
  isShowcaseCard,
  SHOWCASE_TREATMENTS,
  type GameplayIdentityCard,
} from "./card-taxonomy";

const card = (id: string, gameplayIdentityKey?: string | null): GameplayIdentityCard => ({ id, gameplayIdentityKey });

describe("getGameplayIdentityKey", () => {
  it("returns an explicit gameplay identity key when present", () => {
    expect(getGameplayIdentityKey(card("printed-1", "identity-1"))).toBe("identity-1");
  });

  it("falls back to id when the explicit key is missing, empty, or whitespace-only", () => {
    expect(getGameplayIdentityKey(card("printed-1"))).toBe("printed-1");
    expect(getGameplayIdentityKey(card("printed-2", ""))).toBe("printed-2");
    expect(getGameplayIdentityKey(card("printed-3", "   "))).toBe("printed-3");
  });
});

describe("areGameplayEquivalent", () => {
  it("returns true for cards sharing the same explicit gameplay identity key", () => {
    expect(areGameplayEquivalent(card("standard-print", "identity-1"), card("showcase-print", "identity-1"))).toBe(true);
  });

  it("returns false for unrelated cards", () => {
    expect(areGameplayEquivalent(card("printed-1", "identity-1"), card("printed-2", "identity-2"))).toBe(false);
  });

  it("returns true for fallback ids only for the same card identity", () => {
    expect(areGameplayEquivalent(card("printed-1"), card("printed-1"))).toBe(true);
  });
});

describe("getRelatedPrintings", () => {
  it("returns deterministic related printings sharing the same gameplay identity and excludes the source card", () => {
    const source = card("standard-print", "identity-1");
    const relatedA = card("showcase-print", "identity-1");
    const unrelated = card("different-card", "identity-2");
    const relatedB = card("signed-print", "identity-1");

    expect(getRelatedPrintings([source, relatedA, unrelated, relatedB], source)).toEqual([relatedA, relatedB]);
  });
});

describe("collector helpers", () => {
  it("recognizes showcase collector cards", () => {
    expect(isShowcaseCard({ collectorCategory: "SHOWCASE" })).toBe(true);
    expect(isCollectorCard({ collectorCategory: "SHOWCASE" })).toBe(true);
  });

  it("does not treat standard cards as showcase or collector cards", () => {
    expect(isShowcaseCard({ collectorCategory: "STANDARD" })).toBe(false);
    expect(isCollectorCard({ collectorCategory: "STANDARD" })).toBe(false);
  });
});

describe("taxonomy constants", () => {
  it("keeps gameplay rarities separate from collector treatments", () => {
    expect(CARD_GAMEPLAY_RARITIES).toEqual(["COMMON", "UNCOMMON", "RARE", "EPIC", "UNKNOWN"]);
    expect(CARD_GAMEPLAY_RARITIES).not.toContain("ULTIMATE");
    expect(SHOWCASE_TREATMENTS).toContain("ULTIMATE");
  });
});
