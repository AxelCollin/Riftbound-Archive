import { describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  deck: {
    findMany: vi.fn(),
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
