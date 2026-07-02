import { beforeEach, describe, expect, it, vi } from "vitest";

const txMock = vi.hoisted(() => ({
  deck: { findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn() },
  deckCardAllocation: { create: vi.fn() },
  collectionEntry: { create: vi.fn(), update: vi.fn(), upsert: vi.fn() },
  collectionTransaction: { create: vi.fn(), update: vi.fn(), upsert: vi.fn() },
}));

const prismaMock = vi.hoisted(() => ({
  $transaction: vi.fn(async (callback) => callback(txMock)),
}));

vi.mock("@/lib/db", () => ({ prisma: prismaMock }));

import { assembleDeck } from "./deck-assembly";

const commonCard = {
  id: "card-1",
  kind: "GAMEPLAY",
  rarity: "COMMON",
  hasShowcase: true,
  collectionEntries: [{ variant: "NORMAL", quantity: 3 }],
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
  });

  it("creates DeckCardAllocation rows and marks the deck ASSEMBLED atomically", async () => {
    txMock.deck.findUnique.mockResolvedValueOnce(theoreticalDeck());

    await assembleDeck("deck-1");

    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(txMock.deckCardAllocation.create).toHaveBeenCalledWith({ data: { deckId: "deck-1", cardId: "card-1", variant: "NORMAL", quantity: 2 } });
    expect(txMock.deck.update).toHaveBeenCalledWith({ where: { id: "deck-1" }, data: { status: "ASSEMBLED" } });
  });

  it("fails without creating allocations or changing status when availability is insufficient", async () => {
    txMock.deck.findUnique.mockResolvedValueOnce(theoreticalDeck({ deckCards: [{ cardId: "card-1", quantity: 3, preferredVariant: "ANY", card: { ...commonCard, collectionEntries: [{ variant: "NORMAL", quantity: 1 }] } }] }));

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
