import { describe, expect, it } from "vitest";
import { getCardDetailHref } from "./card-detail-link";

describe("collection card detail links", () => {
  it("encodes card ids as a single route-safe segment", () => {
    expect(getCardDetailHref("set/001?lang=fr#foil")).toBe("/cards/set%2F001%3Flang%3Dfr%23foil");
    expect(getCardDetailHref("rba%2F001")).toBe("/cards/rba%252F001");
  });
});
