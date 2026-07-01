import { describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  deck: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
  },
}));

vi.mock("../db", () => ({
  prisma: prismaMock,
}));

import {
  createDeckListRows,
  getDeckListPageData,
  summarizeDeckListRows,
} from "./decks";

function deck(overrides = {}) {
  return {
    id: "deck-1",
    name: "Deck Alpha",
    status: "THEORETICAL" as const,
    allocationStrategy: "PRESERVE_PREMIUM_VARIANTS" as const,
    description: null,
    createdAt: new Date("2026-06-01T10:00:00.000Z"),
    updatedAt: new Date("2026-06-10T10:00:00.000Z"),
    deckCards: [],
    allocations: [],
    _count: { deckCards: 0, allocations: 0 },
    ...overrides,
  };
}

describe("deck list query", () => {
  it("fetches decks with read-only selected fields", async () => {
    prismaMock.deck.findMany.mockResolvedValueOnce([]);

    const data = await getDeckListPageData();

    expect(prismaMock.deck.findMany).toHaveBeenCalledWith({
      orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        status: true,
        allocationStrategy: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        deckCards: { select: { quantity: true } },
        allocations: { select: { quantity: true } },
        _count: { select: { deckCards: true, allocations: true } },
      },
    });
    expect(data).toEqual({
      rows: [],
      summary: {
        totalDecks: 0,
        theoreticalDecks: 0,
        assembledDecks: 0,
        archivedDecks: 0,
        totalRequiredCards: 0,
        totalAllocatedCards: 0,
      },
    });
  });

  it("fetches decks with deterministic ordering", () => {
    const rows = createDeckListRows([
      deck({ id: "archived-new", name: "Archived New", status: "ARCHIVED", updatedAt: new Date("2026-06-30T10:00:00.000Z") }),
      deck({ id: "assembled-a", name: "Alpha", status: "ASSEMBLED", updatedAt: new Date("2026-06-20T10:00:00.000Z") }),
      deck({ id: "theoretical-b", name: "Beta", status: "THEORETICAL", updatedAt: new Date("2026-06-20T10:00:00.000Z") }),
      deck({ id: "theoretical-new", name: "Newest", status: "THEORETICAL", updatedAt: new Date("2026-06-25T10:00:00.000Z") }),
    ]);

    expect(rows.map((row) => row.deckId)).toEqual([
      "theoretical-new",
      "assembled-a",
      "theoretical-b",
      "archived-new",
    ]);
  });

  it("maps deck rows with counts and summed quantities", () => {
    const [row] = createDeckListRows([
      deck({
        id: "deck-counts",
        name: "Quantity Deck",
        status: "ASSEMBLED",
        allocationStrategy: "EXACT_VARIANT",
        description: "Deck de test",
        deckCards: [{ quantity: 3 }, { quantity: 2 }],
        allocations: [{ quantity: 1 }, { quantity: 4 }],
        _count: { deckCards: 2, allocations: 2 },
      }),
    ]);

    expect(row).toEqual({
      deckId: "deck-counts",
      name: "Quantity Deck",
      status: "ASSEMBLED",
      allocationStrategy: "EXACT_VARIANT",
      description: "Deck de test",
      deckCardLineCount: 2,
      requiredCardQuantity: 5,
      allocationLineCount: 2,
      allocatedCardQuantity: 5,
      createdAt: "2026-06-01T10:00:00.000Z",
      updatedAt: "2026-06-10T10:00:00.000Z",
    });
  });

  it("computes summary totals and separates deck statuses", () => {
    const rows = createDeckListRows([
      deck({ id: "theoretical", status: "THEORETICAL", deckCards: [{ quantity: 2 }], _count: { deckCards: 1, allocations: 0 } }),
      deck({ id: "assembled", status: "ASSEMBLED", deckCards: [{ quantity: 3 }], allocations: [{ quantity: 1 }], _count: { deckCards: 1, allocations: 1 } }),
      deck({ id: "archived", status: "ARCHIVED", deckCards: [{ quantity: 4 }], allocations: [{ quantity: 2 }], _count: { deckCards: 1, allocations: 1 } }),
    ]);

    expect(summarizeDeckListRows(rows)).toEqual({
      totalDecks: 3,
      theoreticalDecks: 1,
      assembledDecks: 1,
      archivedDecks: 1,
      totalRequiredCards: 9,
      totalAllocatedCards: 3,
    });
  });

  it("does not require deck cards or allocations to exist", () => {
    const [row] = createDeckListRows([deck({ id: "empty-deck" })]);

    expect(row).toMatchObject({
      deckId: "empty-deck",
      deckCardLineCount: 0,
      requiredCardQuantity: 0,
      allocationLineCount: 0,
      allocatedCardQuantity: 0,
    });
  });
});

describe("deck edit query", () => {
  it("returns serializable edit data", async () => {
    prismaMock.deck.findUnique.mockResolvedValueOnce({
      id: "deck-1",
      name: "Deck Alpha",
      description: "Test",
      allocationStrategy: "ANY_VARIANT",
      status: "ASSEMBLED",
    });

    const { getDeckEditData } = await import("./decks");
    await expect(getDeckEditData("deck-1")).resolves.toEqual({
      deckId: "deck-1",
      name: "Deck Alpha",
      description: "Test",
      allocationStrategy: "ANY_VARIANT",
      status: "ASSEMBLED",
    });
  });

  it("returns null when edit deck is not found", async () => {
    prismaMock.deck.findUnique.mockResolvedValueOnce(null);

    const { getDeckEditData } = await import("./decks");
    await expect(getDeckEditData("missing")).resolves.toBeNull();
  });

  it("selects only needed edit fields", async () => {
    prismaMock.deck.findUnique.mockResolvedValueOnce(null);

    const { getDeckEditData } = await import("./decks");
    await getDeckEditData("deck-1");

    expect(prismaMock.deck.findUnique).toHaveBeenCalledWith({
      where: { id: "deck-1" },
      select: {
        id: true,
        name: true,
        description: true,
        allocationStrategy: true,
        status: true,
      },
    });
  });
});

describe("deck detail query", () => {
  function cardRecord(overrides = {}) {
    return {
      id: "card-1",
      name: "Official Card",
      collectorNumber: "001",
      rarity: "COMMON" as const,
      kind: "GAMEPLAY" as const,
      printTreatment: "REGULAR" as const,
      hasShowcase: false,
      set: { code: "SET1", name: "Set One" },
      translations: [],
      ...overrides,
    };
  }

  function detailDeck(overrides = {}) {
    return {
      id: "deck-detail",
      name: "Deck Detail",
      description: "Lecture seule",
      status: "THEORETICAL" as const,
      allocationStrategy: "PRESERVE_PREMIUM_VARIANTS" as const,
      createdAt: new Date("2026-06-01T10:00:00.000Z"),
      updatedAt: new Date("2026-06-02T10:00:00.000Z"),
      deckCards: [],
      allocations: [],
      ...overrides,
    };
  }

  it("returns null when deck detail is not found", async () => {
    prismaMock.deck.findUnique.mockResolvedValueOnce(null);
    const { getDeckDetailPageData } = await import("./decks");

    await expect(getDeckDetailPageData("missing")).resolves.toBeNull();
  });

  it("fetches only needed deck detail fields", async () => {
    prismaMock.deck.findUnique.mockResolvedValueOnce(null);
    const { getDeckDetailPageData } = await import("./decks");
    await getDeckDetailPageData("deck-detail");

    expect(prismaMock.deck.findUnique).toHaveBeenCalledWith({
      where: { id: "deck-detail" },
      select: expect.objectContaining({
        id: true,
        name: true,
        description: true,
        status: true,
        allocationStrategy: true,
        createdAt: true,
        updatedAt: true,
        deckCards: expect.objectContaining({ select: expect.any(Object) }),
        allocations: expect.objectContaining({ select: expect.any(Object) }),
      }),
    });
  });

  it("maps metadata, requirements, allocations, and summary totals", async () => {
    prismaMock.deck.findUnique.mockResolvedValueOnce(detailDeck({
      deckCards: [
        { id: "dc-1", cardId: "card-1", quantity: 3, preferredVariant: "ANY", card: cardRecord({ translations: [{ locale: "fr-FR", name: "Carte française" }] }) },
      ],
      allocations: [
        { id: "alloc-1", cardId: "card-1", variant: "FOIL", quantity: 2, card: cardRecord() },
      ],
    }));
    const { getDeckDetailPageData } = await import("./decks");

    await expect(getDeckDetailPageData("deck-detail")).resolves.toMatchObject({
      deckId: "deck-detail",
      name: "Deck Detail",
      description: "Lecture seule",
      createdAt: "2026-06-01T10:00:00.000Z",
      updatedAt: "2026-06-02T10:00:00.000Z",
      requirements: [{ deckCardId: "dc-1", cardId: "card-1", displayName: "Carte française", quantity: 3, preferredVariant: "ANY" }],
      allocations: [{ allocationId: "alloc-1", cardId: "card-1", variant: "FOIL", quantity: 2 }],
      summary: { requirementLineCount: 1, requiredCardQuantity: 3, allocationLineCount: 1, allocatedCardQuantity: 2 },
    });
  });

  it("handles empty requirements and allocations", async () => {
    prismaMock.deck.findUnique.mockResolvedValueOnce(detailDeck());
    const { getDeckDetailPageData } = await import("./decks");

    await expect(getDeckDetailPageData("deck-detail")).resolves.toMatchObject({
      requirements: [],
      allocations: [],
      summary: { requirementLineCount: 0, requiredCardQuantity: 0, allocationLineCount: 0, allocatedCardQuantity: 0 },
    });
  });

  it("sorts requirements and allocations deterministically", async () => {
    prismaMock.deck.findUnique.mockResolvedValueOnce(detailDeck({
      deckCards: [
        { id: "dc-b", cardId: "card-b", quantity: 1, preferredVariant: "FOIL", card: cardRecord({ id: "card-b", name: "B", collectorNumber: "010", set: { code: "SET2", name: "Set Two" } }) },
        { id: "dc-a", cardId: "card-a", quantity: 1, preferredVariant: "ANY", card: cardRecord({ id: "card-a", name: "A", collectorNumber: "002" }) },
      ],
      allocations: [
        { id: "alloc-b", cardId: "card-b", variant: "SHOWCASE", quantity: 1, card: cardRecord({ id: "card-b", name: "B", collectorNumber: "010", set: { code: "SET2", name: "Set Two" } }) },
        { id: "alloc-a", cardId: "card-a", variant: "NORMAL", quantity: 1, card: cardRecord({ id: "card-a", name: "A", collectorNumber: "002" }) },
      ],
    }));
    const { getDeckDetailPageData } = await import("./decks");
    const data = await getDeckDetailPageData("deck-detail");

    expect(data?.requirements.map((row) => row.deckCardId)).toEqual(["dc-a", "dc-b"]);
    expect(data?.allocations.map((row) => row.allocationId)).toEqual(["alloc-a", "alloc-b"]);
  });
});
