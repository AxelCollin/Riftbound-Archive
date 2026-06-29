import { describe, expect, it } from "vitest";
import { getCardDetailHref } from "./card-detail-link";

describe("collection card detail links", () => {
  it.each([
    ["slash", "set/001"],
    ["query", "set?001"],
    ["hash", "set#001"],
    ["percent", "set%001"],
    ["literal encoded slash", "set%2F001"],
    ["several reserved characters", "set/001?lang=fr#foil"],
  ])("encodes a card id containing %s as a single route-safe segment", (_caseName, cardId) => {
    expect(getCardDetailHref(cardId)).toBe(`/cards/${encodeURIComponent(cardId)}`);
  });
});
