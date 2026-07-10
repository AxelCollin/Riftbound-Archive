import { beforeEach, describe, expect, it, vi } from "vitest";

const txMock = vi.hoisted(() => ({
  deck: { findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn() },
  deckCardAllocation: { create: vi.fn(), deleteMany: vi.fn() },
  collectionEntry: { create: vi.fn(), update: vi.fn(), upsert: vi.fn() },
  collectionTransaction: { create: vi.fn(), update: vi.fn(), upsert: vi.fn() },
}));

const prismaMock = vi.hoisted(() => ({
  $transaction: vi.fn(async (callback) => callback(txMock)),
}));

vi.mock("@/lib/db", () => ({ prisma: prismaMock }));

import { assembleDeck, disassembleDeck } from "./deck-assembly";

const commonCard = {
  id: "card-1",
  kind: "GAMEPLAY",
  rarity: "COMMON",
  hasShowcase: true,
  collectionEntries: [{ variant: "NORMAL", physicalFinish: "NORMAL", cardLanguage: "UNKNOWN", quantity: 3 }],
} as const;

function theoreticalDeck(overrides = {}) {
  return {
    id: "deck-1",
    status: "THEORETICAL",
    deckCards: [{ cardId: "card-1", quantity: 2, preferredVariant: "ANY", card: commonCard }],
    allocations: [],
    ...overrides,
  };
}

describe("assembleDeck service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    txMock.deck.findMany.mockResolvedValue([]);
    txMock.deck.update.mockResolvedValue({});
    txMock.deckCardAllocation.create.mockResolvedValue({});
    txMock.deckCardAllocation.deleteMany.mockResolvedValue({ count: 0 });
  });

  it("creates DeckCardAllocation rows and marks the deck ASSEMBLED atomically", async () => {
    txMock.deck.findUnique.mockResolvedValueOnce(theoreticalDeck());

    await assembleDeck("deck-1");

    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(txMock.deckCardAllocation.create).toHaveBeenCalledWith({ data: { deckId: "deck-1", cardId: "card-1", variant: "NORMAL", physicalFinish: "NORMAL", cardLanguage: "UNKNOWN", quantity: 2 } });
    expect(txMock.deck.update).toHaveBeenCalledWith({ where: { id: "deck-1" }, data: { status: "ASSEMBLED" } });
  });

  it("persists FR allocations instead of UNKNOWN when only FR owned copies back the plan", async () => {
    txMock.deck.findUnique.mockResolvedValueOnce(theoreticalDeck({
      deckCards: [{
        cardId: "card-1",
        quantity: 2,
        preferredVariant: "ANY",
        card: { ...commonCard, collectionEntries: [{ variant: "NORMAL", physicalFinish: "NORMAL", cardLanguage: "FR", quantity: 3 }] },
      }],
    }));

    await assembleDeck("deck-1");

    expect(txMock.deckCardAllocation.create).toHaveBeenCalledWith({ data: { deckId: "deck-1", cardId: "card-1", variant: "NORMAL", physicalFinish: "NORMAL", cardLanguage: "FR", quantity: 2 } });
  });

  it("keeps UNKNOWN allocations for legacy UNKNOWN owned rows", async () => {
    txMock.deck.findUnique.mockResolvedValueOnce(theoreticalDeck());

    await assembleDeck("deck-1");

    expect(txMock.deckCardAllocation.create).toHaveBeenCalledWith({ data: { deckId: "deck-1", cardId: "card-1", variant: "NORMAL", physicalFinish: "NORMAL", cardLanguage: "UNKNOWN", quantity: 2 } });
  });

  it("splits persisted allocations across concrete languages when one language cannot cover the planned quantity", async () => {
    txMock.deck.findUnique.mockResolvedValueOnce(theoreticalDeck({
      deckCards: [{
        cardId: "card-1",
        quantity: 3,
        preferredVariant: "NORMAL",
        card: {
          ...commonCard,
          binderOverrides: [{ mode: "DISABLED" }],
          collectionEntries: [
            { variant: "NORMAL", physicalFinish: "NORMAL", cardLanguage: "FR", quantity: 1 },
            { variant: "NORMAL", physicalFinish: "NORMAL", cardLanguage: "EN", quantity: 3 },
          ],
        },
      }],
    }));

    await assembleDeck("deck-1");

    expect(txMock.deckCardAllocation.create).toHaveBeenNthCalledWith(1, { data: { deckId: "deck-1", cardId: "card-1", variant: "NORMAL", physicalFinish: "NORMAL", cardLanguage: "FR", quantity: 1 } });
    expect(txMock.deckCardAllocation.create).toHaveBeenNthCalledWith(2, { data: { deckId: "deck-1", cardId: "card-1", variant: "NORMAL", physicalFinish: "NORMAL", cardLanguage: "EN", quantity: 2 } });
  });

  it("subtracts existing assembled deck allocations by concrete cardLanguage", async () => {
    txMock.deck.findMany.mockResolvedValueOnce([{ allocations: [{ cardId: "card-1", variant: "NORMAL", physicalFinish: "NORMAL", cardLanguage: "FR", quantity: 1 }] }]);
    txMock.deck.findUnique.mockResolvedValueOnce(theoreticalDeck({
      deckCards: [{
        cardId: "card-1",
        quantity: 2,
        preferredVariant: "NORMAL",
        card: {
          ...commonCard,
          binderOverrides: [{ mode: "DISABLED" }],
          collectionEntries: [
            { variant: "NORMAL", physicalFinish: "NORMAL", cardLanguage: "FR", quantity: 2 },
            { variant: "NORMAL", physicalFinish: "NORMAL", cardLanguage: "EN", quantity: 1 },
          ],
        },
      }],
    }));

    await assembleDeck("deck-1");

    expect(txMock.deckCardAllocation.create).toHaveBeenNthCalledWith(1, { data: { deckId: "deck-1", cardId: "card-1", variant: "NORMAL", physicalFinish: "NORMAL", cardLanguage: "FR", quantity: 1 } });
    expect(txMock.deckCardAllocation.create).toHaveBeenNthCalledWith(2, { data: { deckId: "deck-1", cardId: "card-1", variant: "NORMAL", physicalFinish: "NORMAL", cardLanguage: "EN", quantity: 1 } });
  });

  it("does not invent UNKNOWN when binder-reserved language rows are consumed before allocation", async () => {
    txMock.deck.findUnique.mockResolvedValueOnce(theoreticalDeck({
      deckCards: [{
        cardId: "card-1",
        quantity: 1,
        preferredVariant: "NORMAL",
        card: {
          ...commonCard,
          collectionEntries: [{ variant: "NORMAL", physicalFinish: "NORMAL", cardLanguage: "FR", quantity: 2 }],
          binderOverrides: [{ mode: "FORCE_VARIANT", variant: "NORMAL", physicalFinish: "NORMAL", cardLanguage: "UNKNOWN", quantity: 1 }],
        },
      }],
    }));

    await assembleDeck("deck-1");

    expect(txMock.deckCardAllocation.create).toHaveBeenCalledWith({ data: { deckId: "deck-1", cardId: "card-1", variant: "NORMAL", physicalFinish: "NORMAL", cardLanguage: "FR", quantity: 1 } });
  });

  it("fails without creating allocations or changing status when availability is insufficient", async () => {
    txMock.deck.findUnique.mockResolvedValueOnce(theoreticalDeck({ deckCards: [{ cardId: "card-1", quantity: 3, preferredVariant: "ANY", card: { ...commonCard, collectionEntries: [{ variant: "NORMAL", physicalFinish: "NORMAL", cardLanguage: "UNKNOWN", quantity: 1 }] } }] }));

    await expect(assembleDeck("deck-1")).rejects.toThrow("Insufficient availability");

    expect(txMock.deckCardAllocation.create).not.toHaveBeenCalled();
    expect(txMock.deck.update).not.toHaveBeenCalled();
  });

  it("rejects an already ASSEMBLED deck without duplicating allocations", async () => {
    txMock.deck.findUnique.mockResolvedValueOnce(theoreticalDeck({ status: "ASSEMBLED" }));

    await expect(assembleDeck("deck-1")).rejects.toThrow("Deck is already assembled.");

    expect(txMock.deckCardAllocation.create).not.toHaveBeenCalled();
    expect(txMock.deck.update).not.toHaveBeenCalled();
  });

  it("does not write CollectionEntry or CollectionTransaction rows", async () => {
    txMock.deck.findUnique.mockResolvedValueOnce(theoreticalDeck());

    await assembleDeck("deck-1");

    expect(txMock.collectionEntry.create).not.toHaveBeenCalled();
    expect(txMock.collectionEntry.update).not.toHaveBeenCalled();
    expect(txMock.collectionEntry.upsert).not.toHaveBeenCalled();
    expect(txMock.collectionTransaction.create).not.toHaveBeenCalled();
    expect(txMock.collectionTransaction.update).not.toHaveBeenCalled();
    expect(txMock.collectionTransaction.upsert).not.toHaveBeenCalled();
  });
});

function assembledDeck(overrides = {}) {
  return theoreticalDeck({
    status: "ASSEMBLED",
    allocations: [{ id: "alloc-1" }, { id: "alloc-2" }],
    ...overrides,
  });
}

describe("disassembleDeck service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    txMock.deck.update.mockResolvedValue({});
    txMock.deckCardAllocation.deleteMany.mockResolvedValue({ count: 2 });
  });

  it("deletes only this deck's DeckCardAllocation rows and marks the deck THEORETICAL atomically", async () => {
    txMock.deck.findUnique.mockResolvedValueOnce(assembledDeck());

    await disassembleDeck("deck-1");

    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(txMock.deckCardAllocation.deleteMany).toHaveBeenCalledWith({ where: { deckId: "deck-1" } });
    expect(txMock.deck.update).toHaveBeenCalledWith({ where: { id: "deck-1" }, data: { status: "THEORETICAL" } });
  });

  it("leaves DeckCard requirements untouched", async () => {
    txMock.deck.findUnique.mockResolvedValueOnce(assembledDeck());

    await disassembleDeck("deck-1");

    expect(txMock).not.toHaveProperty("deckCard");
    expect(txMock.deckCardAllocation.deleteMany).toHaveBeenCalledWith({ where: { deckId: "deck-1" } });
  });

  it("does not write CollectionEntry or CollectionTransaction rows", async () => {
    txMock.deck.findUnique.mockResolvedValueOnce(assembledDeck());

    await disassembleDeck("deck-1");

    expect(txMock.collectionEntry.create).not.toHaveBeenCalled();
    expect(txMock.collectionEntry.update).not.toHaveBeenCalled();
    expect(txMock.collectionEntry.upsert).not.toHaveBeenCalled();
    expect(txMock.collectionTransaction.create).not.toHaveBeenCalled();
    expect(txMock.collectionTransaction.update).not.toHaveBeenCalled();
    expect(txMock.collectionTransaction.upsert).not.toHaveBeenCalled();
  });

  it("rejects THEORETICAL deck disassembly", async () => {
    txMock.deck.findUnique.mockResolvedValueOnce(theoreticalDeck());

    await expect(disassembleDeck("deck-1")).rejects.toThrow("Only assembled decks can be disassembled.");

    expect(txMock.deckCardAllocation.deleteMany).not.toHaveBeenCalled();
    expect(txMock.deck.update).not.toHaveBeenCalled();
  });

  it("rejects missing decks", async () => {
    txMock.deck.findUnique.mockResolvedValueOnce(null);

    await expect(disassembleDeck("missing")).rejects.toThrow("Deck not found.");

    expect(txMock.deckCardAllocation.deleteMany).not.toHaveBeenCalled();
    expect(txMock.deck.update).not.toHaveBeenCalled();
  });

  it("does not change status when allocation deletion fails", async () => {
    txMock.deck.findUnique.mockResolvedValueOnce(assembledDeck());
    txMock.deckCardAllocation.deleteMany.mockRejectedValueOnce(new Error("delete failed"));

    await expect(disassembleDeck("deck-1")).rejects.toThrow("delete failed");

    expect(txMock.deck.update).not.toHaveBeenCalled();
  });

  it("does not delete allocations when status validation fails", async () => {
    txMock.deck.findUnique.mockResolvedValueOnce(theoreticalDeck());

    await expect(disassembleDeck("deck-1")).rejects.toThrow("Only assembled decks can be disassembled.");

    expect(txMock.deckCardAllocation.deleteMany).not.toHaveBeenCalled();
  });
});
