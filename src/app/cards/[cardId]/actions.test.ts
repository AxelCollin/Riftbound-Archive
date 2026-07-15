import { describe, expect, it, vi, beforeEach } from "vitest";

const cache = vi.hoisted(() => ({ revalidatePath: vi.fn() }));
const nav = vi.hoisted(() => ({ redirect: vi.fn((url: string) => { throw new Error(`REDIRECT:${url}`); }) }));
const tx = vi.hoisted(() => ({ recordCollectionFinishAdjustment: vi.fn() }));
const meta = vi.hoisted(() => ({ setCardFavorite: vi.fn(), setCardNote: vi.fn() }));
vi.mock("next/cache", () => cache);
vi.mock("next/navigation", () => nav);
vi.mock("@/lib/services/collection-transactions", () => tx);
vi.mock("@/lib/services/card-user-meta", () => meta);

import { updateCardDetailQuantityAction, updateCardFavoriteAction, updateCardNoteAction } from "./actions";

function form(entries: Record<string, string>) { const fd = new FormData(); Object.entries(entries).forEach(([k, v]) => fd.set(k, v)); return fd; }

describe("card detail actions", () => {
  beforeEach(() => vi.clearAllMocks());

  it("records quantity ADD and redirects to exact card detail", async () => {
    tx.recordCollectionFinishAdjustment.mockResolvedValueOnce({});
    await expect(updateCardDetailQuantityAction(form({ cardId: "card/id", physicalFinish: "NORMAL", operation: "ADD" }))).rejects.toThrow("REDIRECT:/cards/card%2Fid?quantityUpdated=1");
    expect(tx.recordCollectionFinishAdjustment).toHaveBeenCalledWith(expect.objectContaining({ cardId: "card/id", physicalFinish: "NORMAL", operation: "ADD", quantity: 1, cardLanguage: "UNKNOWN", source: "CARD_DETAIL_DIRECT_EDIT" }));
    expect(cache.revalidatePath).toHaveBeenCalledWith("/cards/card%2Fid");
    expect(cache.revalidatePath).toHaveBeenCalledWith("/cards/card%2Fid/availability");
    expect(cache.revalidatePath).toHaveBeenCalledWith("/collection");
    expect(cache.revalidatePath).toHaveBeenCalledWith("/binder");
  });

  it("records REMOVE and rejects invalid finish or operation", async () => {
    tx.recordCollectionFinishAdjustment.mockResolvedValueOnce({});
    await expect(updateCardDetailQuantityAction(form({ cardId: "card", physicalFinish: "FOIL", operation: "REMOVE" }))).rejects.toThrow("quantityUpdated");
    expect(tx.recordCollectionFinishAdjustment).toHaveBeenCalledWith(expect.objectContaining({ operation: "REMOVE", physicalFinish: "FOIL" }));
    await expect(updateCardDetailQuantityAction(form({ cardId: "card", physicalFinish: "SHOWCASE", operation: "ADD" }))).rejects.toThrow("quantityError");
    await expect(updateCardDetailQuantityAction(form({ cardId: "card", physicalFinish: "NORMAL", operation: "SET" }))).rejects.toThrow("quantityError");
  });

  it("redirects quantity service failure back to encoded card", async () => {
    tx.recordCollectionFinishAdjustment.mockRejectedValueOnce(new Error("Boom"));
    await expect(updateCardDetailQuantityAction(form({ cardId: "card/id", physicalFinish: "NORMAL", operation: "ADD" }))).rejects.toThrow("/cards/card%2Fid?quantityError=Boom");
  });

  it("updates explicit favorite target", async () => {
    meta.setCardFavorite.mockResolvedValueOnce({});
    await expect(updateCardFavoriteAction(form({ cardId: "card/id", favorite: "false" }))).rejects.toThrow("/cards/card%2Fid?favoriteUpdated=1");
    expect(meta.setCardFavorite).toHaveBeenCalledWith({ cardId: "card/id", favorite: false });
    expect(cache.revalidatePath).toHaveBeenCalledWith("/collection");
  });

  it("updates note and redirects validation errors", async () => {
    meta.setCardNote.mockResolvedValueOnce({});
    await expect(updateCardNoteAction(form({ cardId: "card/id", note: " hello " }))).rejects.toThrow("noteUpdated=1");
    expect(meta.setCardNote).toHaveBeenCalledWith({ cardId: "card/id", note: " hello " });
    meta.setCardNote.mockRejectedValueOnce(new Error("Trop long"));
    await expect(updateCardNoteAction(form({ cardId: "card/id", note: "x" }))).rejects.toThrow("noteError=Trop%20long");
  });
});
