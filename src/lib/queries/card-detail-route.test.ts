import { describe, expect, it, vi } from "vitest";
import { getCardIdRouteLookupCandidates, getFirstCardDetailLookupResult } from "./card-detail-route";

describe("card detail route lookup candidates", () => {
  it.each([
    ["plain id", "card-001", ["card-001"]],
    ["encoded slash", "set%2F001", ["set%2F001", "set/001"]],
    ["encoded query and hash characters", "set%3F001%23foil", ["set%3F001%23foil", "set?001#foil"]],
    ["literal percent sequence", "rba%2F001", ["rba%2F001", "rba/001"]],
    ["double-encoded literal slash sequence", "set%252F001", ["set%252F001", "set%2F001"]],
    ["malformed percent encoding", "bad%zz", ["bad%zz"]],
  ])("returns route lookup candidates for %s", (_caseName, routeCardId, expectedCandidates) => {
    expect(getCardIdRouteLookupCandidates(routeCardId)).toEqual(expectedCandidates);
  });
});

describe("first card detail lookup result", () => {
  it("prefers the exact candidate if that lookup returns a card", async () => {
    const lookup = vi.fn(async (cardId: string) => (cardId === "rba%2F001" ? { id: cardId } : null));

    await expect(getFirstCardDetailLookupResult("rba%2F001", lookup)).resolves.toEqual({ id: "rba%2F001" });

    expect(lookup).toHaveBeenCalledTimes(1);
    expect(lookup).toHaveBeenCalledWith("rba%2F001");
  });

  it("falls back to the decoded candidate only when exact lookup returns null", async () => {
    const lookup = vi.fn(async (cardId: string) => (cardId === "set/001" ? { id: cardId } : null));

    await expect(getFirstCardDetailLookupResult("set%2F001", lookup)).resolves.toEqual({ id: "set/001" });

    expect(lookup).toHaveBeenNthCalledWith(1, "set%2F001");
    expect(lookup).toHaveBeenNthCalledWith(2, "set/001");
  });

  it("returns null if no lookup candidate matches", async () => {
    const lookup = vi.fn(async () => null);

    await expect(getFirstCardDetailLookupResult("set%2F001", lookup)).resolves.toBeNull();

    expect(lookup).toHaveBeenNthCalledWith(1, "set%2F001");
    expect(lookup).toHaveBeenNthCalledWith(2, "set/001");
  });

  it("does not throw for malformed percent encoding and returns null when exact lookup misses", async () => {
    const lookup = vi.fn(async () => null);

    await expect(getFirstCardDetailLookupResult("bad%zz", lookup)).resolves.toBeNull();

    expect(lookup).toHaveBeenCalledOnce();
    expect(lookup).toHaveBeenCalledWith("bad%zz");
  });
});
