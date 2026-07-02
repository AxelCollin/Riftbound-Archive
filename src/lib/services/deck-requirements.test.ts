import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const txMock = vi.hoisted(() => ({
  deck: { findUnique: vi.fn() },
  card: { findUnique: vi.fn() },
  deckCard: {
    upsert: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

const prismaMock = vi.hoisted(() => ({
  deck: { findUnique: vi.fn() },
  card: { findUnique: vi.fn() },
  deckCard: {
    upsert: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  deckCardAllocation: { create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  collectionEntry: {
    create: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
  },
  collectionTransaction: { create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  $transaction: vi.fn(async (callback) => callback(txMock)),
}));

vi.mock("@/lib/db", () => ({ prisma: prismaMock }));

import {
  addDeckRequirement,
  deleteDeckRequirement,
  updateDeckRequirement,
} from "./deck-requirements";

const gameplayCard = {
  id: "card-1",
  kind: "GAMEPLAY" as const,
  rarity: "COMMON" as const,
  hasShowcase: true,
};
const energyCard = {
  id: "energy-1",
  kind: "ENERGY" as const,
  rarity: "UNKNOWN" as const,
  hasShowcase: false,
};

function expectNoForbiddenWrites() {
  expect(prismaMock.deckCardAllocation.create).not.toHaveBeenCalled();
  expect(prismaMock.deckCardAllocation.update).not.toHaveBeenCalled();
  expect(prismaMock.deckCardAllocation.delete).not.toHaveBeenCalled();
  expect(prismaMock.collectionEntry.create).not.toHaveBeenCalled();
  expect(prismaMock.collectionEntry.update).not.toHaveBeenCalled();
  expect(prismaMock.collectionEntry.upsert).not.toHaveBeenCalled();
  expect(prismaMock.collectionEntry.delete).not.toHaveBeenCalled();
  expect(prismaMock.collectionTransaction.create).not.toHaveBeenCalled();
  expect(prismaMock.collectionTransaction.update).not.toHaveBeenCalled();
  expect(prismaMock.collectionTransaction.delete).not.toHaveBeenCalled();
}

describe("deck requirement write service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.deck.findUnique.mockResolvedValue({
      id: "deck-1",
      status: "THEORETICAL",
    });
    prismaMock.card.findUnique.mockResolvedValue(gameplayCard);
    txMock.deck.findUnique.mockResolvedValue({
      id: "deck-1",
      status: "THEORETICAL",
    });
    txMock.card.findUnique.mockResolvedValue(gameplayCard);
    txMock.deckCard.findFirst.mockResolvedValue(null);
  });

  it("addDeckRequirement creates or increments through an upsert", async () => {
    await addDeckRequirement("deck-1", {
      cardId: " card-1 ",
      quantity: 2,
      preferredVariant: "ANY",
    });

    expect(txMock.deckCard.upsert).toHaveBeenCalledWith({
      where: {
        deckId_cardId_preferredVariant: {
          deckId: "deck-1",
          cardId: "card-1",
          preferredVariant: "ANY",
        },
      },
      create: {
        deckId: "deck-1",
        cardId: "card-1",
        preferredVariant: "ANY",
        quantity: 2,
      },
      update: { quantity: { increment: 2 } },
    });
    expectNoForbiddenWrites();
  });

  it("rejects missing deck", async () => {
    txMock.deck.findUnique.mockResolvedValueOnce(null);
    await expect(
      addDeckRequirement("missing", {
        cardId: "card-1",
        quantity: 1,
        preferredVariant: "ANY",
      }),
    ).rejects.toThrow("Deck not found.");
    expect(txMock.deckCard.upsert).not.toHaveBeenCalled();
  });

  it("rejects missing card", async () => {
    txMock.card.findUnique.mockResolvedValueOnce(null);
    await expect(
      addDeckRequirement("deck-1", {
        cardId: "missing",
        quantity: 1,
        preferredVariant: "ANY",
      }),
    ).rejects.toThrow("Card not found.");
  });

  it("rejects TOKEN and RULES cards", async () => {
    txMock.card.findUnique.mockResolvedValueOnce({
      ...gameplayCard,
      kind: "TOKEN",
    });
    await expect(
      addDeckRequirement("deck-1", {
        cardId: "token",
        quantity: 1,
        preferredVariant: "ANY",
      }),
    ).rejects.toThrow("trackable");

    txMock.card.findUnique.mockResolvedValueOnce({
      ...gameplayCard,
      kind: "RULES",
    });
    await expect(
      addDeckRequirement("deck-1", {
        cardId: "rules",
        quantity: 1,
        preferredVariant: "ANY",
      }),
    ).rejects.toThrow("trackable");
  });

  it("accepts GAMEPLAY and ENERGY cards", async () => {
    await addDeckRequirement("deck-1", {
      cardId: "card-1",
      quantity: 1,
      preferredVariant: "FOIL",
    });
    txMock.card.findUnique.mockResolvedValueOnce(energyCard);
    await addDeckRequirement("deck-1", {
      cardId: "energy-1",
      quantity: 1,
      preferredVariant: "FOIL",
    });

    expect(txMock.deckCard.upsert).toHaveBeenCalledTimes(2);
  });

  it("rejects unsupported exact preferred variants", async () => {
    txMock.card.findUnique.mockResolvedValueOnce({
      ...gameplayCard,
      rarity: "RARE",
      hasShowcase: false,
    });
    await expect(
      addDeckRequirement("deck-1", {
        cardId: "card-1",
        quantity: 1,
        preferredVariant: "NORMAL",
      }),
    ).rejects.toThrow("not supported");
  });

  it("updateDeckRequirement updates the matching deck card row", async () => {
    txMock.deckCard.findFirst
      .mockResolvedValueOnce({ id: "dc-1" })
      .mockResolvedValueOnce(null);
    await updateDeckRequirement("deck-1", "dc-1", {
      cardId: "card-1",
      quantity: 3,
      preferredVariant: "FOIL",
    });

    expect(txMock.deckCard.update).toHaveBeenCalledWith({
      where: { id: "dc-1" },
      data: { cardId: "card-1", preferredVariant: "FOIL", quantity: 3 },
    });
    expectNoForbiddenWrites();
  });

  it("updateDeckRequirement does not update a row from another deck", async () => {
    txMock.deckCard.findFirst.mockResolvedValueOnce(null);
    await expect(
      updateDeckRequirement("deck-1", "other-row", {
        cardId: "card-1",
        quantity: 1,
        preferredVariant: "ANY",
      }),
    ).rejects.toThrow("Deck requirement not found.");
    expect(txMock.deckCard.update).not.toHaveBeenCalled();
  });

  it("updateDeckRequirement merges into an existing same deck/card/preference row", async () => {
    txMock.deckCard.findFirst
      .mockResolvedValueOnce({ id: "dc-old" })
      .mockResolvedValueOnce({ id: "dc-target" });
    await updateDeckRequirement("deck-1", "dc-old", {
      cardId: "card-1",
      quantity: 4,
      preferredVariant: "ANY",
    });

    expect(txMock.deckCard.update).toHaveBeenCalledWith({
      where: { id: "dc-target" },
      data: { quantity: { increment: 4 } },
    });
    expect(txMock.deckCard.delete).toHaveBeenCalledWith({
      where: { id: "dc-old" },
    });
  });

  it("addDeckRequirement rejects assembled decks without changing DeckCard rows", async () => {
    txMock.deck.findUnique.mockResolvedValueOnce({
      id: "deck-1",
      status: "ASSEMBLED",
    });

    await expect(
      addDeckRequirement("deck-1", {
        cardId: "card-1",
        quantity: 1,
        preferredVariant: "ANY",
      }),
    ).rejects.toThrow("theoretical");

    expect(txMock.deckCard.upsert).not.toHaveBeenCalled();
    expect(txMock.deckCard.update).not.toHaveBeenCalled();
    expect(txMock.deckCard.delete).not.toHaveBeenCalled();
  });

  it("updateDeckRequirement rejects assembled decks without changing DeckCard rows", async () => {
    txMock.deck.findUnique.mockResolvedValueOnce({
      id: "deck-1",
      status: "ASSEMBLED",
    });

    await expect(
      updateDeckRequirement("deck-1", "dc-1", {
        cardId: "card-1",
        quantity: 2,
        preferredVariant: "ANY",
      }),
    ).rejects.toThrow("theoretical");

    expect(txMock.deckCard.update).not.toHaveBeenCalled();
    expect(txMock.deckCard.delete).not.toHaveBeenCalled();
  });

  it("deleteDeckRequirement rejects assembled decks without changing DeckCard rows", async () => {
    txMock.deck.findUnique.mockResolvedValueOnce({
      id: "deck-1",
      status: "ASSEMBLED",
    });

    await expect(deleteDeckRequirement("deck-1", "dc-1")).rejects.toThrow(
      "theoretical",
    );

    expect(txMock.deckCard.delete).not.toHaveBeenCalled();
  });

  it("deleteDeckRequirement deletes the matching row without deleting allocations", async () => {
    txMock.deckCard.findFirst.mockResolvedValueOnce({ id: "dc-1" });
    await deleteDeckRequirement("deck-1", "dc-1");

    expect(txMock.deckCard.delete).toHaveBeenCalledWith({
      where: { id: "dc-1" },
    });
    expectNoForbiddenWrites();
  });
});
