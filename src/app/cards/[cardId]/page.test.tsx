import { beforeEach, describe, expect, it, vi } from "vitest";

const getCardDetailMock = vi.fn();

vi.mock("@/lib/queries/card-detail", () => ({
  getCardDetail: getCardDetailMock,
}));

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

describe("CardDetailPage route params", () => {
  beforeEach(() => {
    getCardDetailMock.mockReset();
  });

  it("queries with the cardId value provided by Next without decoding it again", async () => {
    const { default: CardDetailPage } = await import("./page");

    getCardDetailMock.mockResolvedValue(null);

    await expect(
      CardDetailPage({
        params: Promise.resolve({ cardId: "rba%2F001" }),
      }),
    ).rejects.toThrow("NEXT_NOT_FOUND");

    expect(getCardDetailMock).toHaveBeenCalledWith("rba%2F001");
  });
});
