import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  deck: {
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  deckCard: {
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  deckCardAllocation: {
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("@/lib/db", () => ({ prisma: prismaMock }));

import { createDeck, deleteDeck, updateDeck } from "./decks";

describe("deck write service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it("createDeck writes normalized metadata with THEORETICAL status", async () => {
    prismaMock.deck.create.mockResolvedValueOnce({ id: "deck-1" });

    await expect(createDeck({ name: "  Deck Alpha  ", description: "  Test  ", allocationStrategy: "ANY_VARIANT" })).resolves.toEqual({ deckId: "deck-1" });

    expect(prismaMock.deck.create).toHaveBeenCalledWith({
      data: {
        name: "Deck Alpha",
        description: "Test",
        allocationStrategy: "ANY_VARIANT",
        status: "THEORETICAL",
      },
      select: { id: true },
    });
  });

  it("updateDeck writes normalized metadata only", async () => {
    prismaMock.deck.update.mockResolvedValueOnce({});

    await updateDeck("deck-1", { name: " Deck Beta ", description: " ", allocationStrategy: "EXACT_VARIANT" });

    expect(prismaMock.deck.update).toHaveBeenCalledWith({
      where: { id: "deck-1" },
      data: {
        name: "Deck Beta",
        description: null,
        allocationStrategy: "EXACT_VARIANT",
      },
    });
  });

  it("deleteDeck deletes by id", async () => {
    prismaMock.deck.delete.mockResolvedValueOnce({});

    await deleteDeck("deck-1");

    expect(prismaMock.deck.delete).toHaveBeenCalledWith({ where: { id: "deck-1" } });
  });

  it("does not write DeckCard or DeckCardAllocation", async () => {
    prismaMock.deck.create.mockResolvedValueOnce({ id: "deck-1" });

    await createDeck({ name: "Deck Alpha", allocationStrategy: "PRESERVE_PREMIUM_VARIANTS" });

    expect(prismaMock.deckCard.create).not.toHaveBeenCalled();
    expect(prismaMock.deckCard.update).not.toHaveBeenCalled();
    expect(prismaMock.deckCard.delete).not.toHaveBeenCalled();
    expect(prismaMock.deckCardAllocation.create).not.toHaveBeenCalled();
    expect(prismaMock.deckCardAllocation.update).not.toHaveBeenCalled();
    expect(prismaMock.deckCardAllocation.delete).not.toHaveBeenCalled();
  });

  it("prevents Prisma writes when input is invalid", async () => {
    await expect(createDeck({ name: " ", allocationStrategy: "PRESERVE_PREMIUM_VARIANTS" })).rejects.toThrow("Deck name is required.");

    expect(prismaMock.deck.create).not.toHaveBeenCalled();
  });
});
