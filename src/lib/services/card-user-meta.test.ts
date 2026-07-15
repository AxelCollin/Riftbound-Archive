import { describe, expect, it, vi } from "vitest";
import { CARD_NOTE_MAX_LENGTH, CardUserMetaServiceError, setCardFavorite, setCardNote } from "./card-user-meta";

function repo(card: { id: string } | null = { id: "card-1" }) {
  return {
    card: { findUnique: vi.fn().mockResolvedValue(card) },
    cardUserMeta: { upsert: vi.fn(async (args) => ({ cardId: args.where.cardId, favorite: args.create.favorite ?? true, note: args.create.note ?? "existing" })) },
  };
}

describe("card user metadata service", () => {
  it("creates or updates favorite while preserving note", async () => {
    const r = repo();
    await expect(setCardFavorite({ cardId: "card-1", favorite: true }, r)).resolves.toMatchObject({ favorite: true });
    expect(r.cardUserMeta.upsert).toHaveBeenCalledWith(expect.objectContaining({ create: { cardId: "card-1", favorite: true }, update: { favorite: true } }));
  });

  it("rejects missing cards for favorite", async () => {
    await expect(setCardFavorite({ cardId: "missing", favorite: true }, repo(null))).rejects.toMatchObject({ code: "CARD_NOT_FOUND" });
  });

  it("maps favorite database failures safely", async () => {
    const r = repo();
    r.cardUserMeta.upsert.mockRejectedValueOnce(new Error("db exploded"));
    await expect(setCardFavorite({ cardId: "card-1", favorite: false }, r)).rejects.toBeInstanceOf(CardUserMetaServiceError);
    await expect(setCardFavorite({ cardId: "card-1", favorite: false }, r)).resolves.toBeDefined();
  });

  it("creates or updates notes while preserving favorite and trimming whitespace", async () => {
    const r = repo();
    await setCardNote({ cardId: "card-1", note: "  À garder  " }, r);
    expect(r.cardUserMeta.upsert).toHaveBeenCalledWith(expect.objectContaining({ create: { cardId: "card-1", note: "À garder" }, update: { note: "À garder" } }));
  });

  it("stores empty trimmed notes as null", async () => {
    const r = repo();
    await setCardNote({ cardId: "card-1", note: "   " }, r);
    expect(r.cardUserMeta.upsert).toHaveBeenCalledWith(expect.objectContaining({ create: { cardId: "card-1", note: null }, update: { note: null } }));
  });

  it("rejects over-limit notes before database mutation and rejects missing cards", async () => {
    const r = repo();
    await expect(setCardNote({ cardId: "card-1", note: "x".repeat(CARD_NOTE_MAX_LENGTH + 1) }, r)).rejects.toMatchObject({ code: "NOTE_TOO_LONG" });
    expect(r.card.findUnique).not.toHaveBeenCalled();
    await expect(setCardNote({ cardId: "missing", note: "ok" }, repo(null))).rejects.toMatchObject({ code: "CARD_NOT_FOUND" });
  });

  it("maps note database failures safely", async () => {
    const r = repo();
    r.cardUserMeta.upsert.mockRejectedValueOnce(new Error("db"));
    await expect(setCardNote({ cardId: "card-1", note: "ok" }, r)).rejects.toMatchObject({ code: "DATABASE_WRITE_FAILED" });
  });
});
