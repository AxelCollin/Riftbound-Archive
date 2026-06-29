import { describe, expect, it, vi } from "vitest";
import { getCardIdRouteLookupCandidates, getFirstCardDetailLookupResult } from "./card-detail-route";

describe("card detail route lookup", () => {
  it("keeps the exact route id first and adds a decoded fallback when decoding changes it", () => {
    expect(getCardIdRouteLookupCandidates("set%2F001")).toEqual(["set%2F001", "set/001"]);
    expect(getCardIdRouteLookupCandidates("rba%2F001")).toEqual(["rba%2F001", "rba/001"]);
  });

  it("returns only the exact route id when decoding fails or does not change it", () => {
    expect(getCardIdRouteLookupCandidates("card-001")).toEqual(["card-001"]);
    expect(getCardIdRouteLookupCandidates("bad%ZZid")).toEqual(["bad%ZZid"]);
  });

  it("prefers the exact id when it exists before trying the decoded fallback", async () => {
    const lookup = vi.fn(async (cardId: string) => (cardId === "rba%2F001" ? { id: cardId } : null));

    await expect(getFirstCardDetailLookupResult("rba%2F001", lookup)).resolves.toEqual({ id: "rba%2F001" });

    expect(lookup).toHaveBeenCalledTimes(1);
    expect(lookup).toHaveBeenCalledWith("rba%2F001");
  });

  it("uses the decoded fallback only after the exact id is not found", async () => {
    const lookup = vi.fn(async (cardId: string) => (cardId === "set/001" ? { id: cardId } : null));

    await expect(getFirstCardDetailLookupResult("set%2F001", lookup)).resolves.toEqual({ id: "set/001" });

    expect(lookup).toHaveBeenNthCalledWith(1, "set%2F001");
    expect(lookup).toHaveBeenNthCalledWith(2, "set/001");
  });

  it("does not throw for malformed percent encoding and returns null when exact lookup misses", async () => {
    const lookup = vi.fn(async () => null);

    await expect(getFirstCardDetailLookupResult("bad%ZZid", lookup)).resolves.toBeNull();

    expect(lookup).toHaveBeenCalledOnce();
    expect(lookup).toHaveBeenCalledWith("bad%ZZid");
  });
});
