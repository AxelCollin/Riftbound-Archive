import { beforeEach, describe, expect, it, vi } from "vitest";

const getCardDetailFromRouteParamMock = vi.fn();

vi.mock("@/lib/queries/card-detail", () => ({
  getCardDetailFromRouteParam: getCardDetailFromRouteParamMock,
}));

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

describe("CardDetailPage route params", () => {
  beforeEach(() => {
    getCardDetailFromRouteParamMock.mockReset();
  });

  it("passes the cardId value provided by Next into route-aware lookup", async () => {
    const { default: CardDetailPage } = await import("./page");

    getCardDetailFromRouteParamMock.mockResolvedValue(null);

    await expect(
      CardDetailPage({
        params: Promise.resolve({ cardId: "rba%2F001" }),
      }),
    ).rejects.toThrow("NEXT_NOT_FOUND");

    expect(getCardDetailFromRouteParamMock).toHaveBeenCalledWith("rba%2F001");
  });
});
