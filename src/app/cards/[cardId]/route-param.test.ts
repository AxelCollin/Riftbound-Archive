import { describe, expect, it } from "vitest";
import { getCardDetailHref } from "../../collection/card-detail-link";
import { decodeCardIdRouteParam } from "./route-param";

describe("card detail route-safe ids", () => {
  it("encodes URL-reserved card id characters in hrefs and decodes the route segment before lookup", () => {
    const cardId = "set/001?lang=fr#foil";
    const href = getCardDetailHref(cardId);

    expect(href).toBe("/cards/set%2F001%3Flang%3Dfr%23foil");
    expect(decodeCardIdRouteParam(href.replace("/cards/", ""))).toBe(cardId);
  });

  it("returns null for malformed percent encoding so the page can render not-found", () => {
    expect(decodeCardIdRouteParam("set%2F001%ZZfoil")).toBeNull();
  });
});
