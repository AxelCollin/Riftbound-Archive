import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  card: { findUnique: vi.fn() },
  deck: { findMany: vi.fn() },
}));

vi.mock("../db", () => ({ prisma: prismaMock }));

import {
  createCardAvailabilityExplanation,
  getCardAvailabilityExplanation,
  getCardAvailabilityExplanationFromRouteParam,
  type CardAvailabilityRecord,
} from "./card-availability";

beforeEach(() => {
  vi.clearAllMocks();
});

function card(overrides: Partial<CardAvailabilityRecord>): CardAvailabilityRecord {
  return {
    id: "card-1",
    name: "Base Name",
    collectorNumber: "001",
    rarity: "COMMON",
    kind: "GAMEPLAY",
    hasShowcase: false,
    set: { code: "ORG", name: "Origins" },
    translations: [],
    collectionEntries: [],
    ...overrides,
  };
}

describe("card availability explanation query", () => {
  it("returns null when the card is not found", async () => {
    prismaMock.card.findUnique.mockResolvedValueOnce(null);
    prismaMock.deck.findMany.mockResolvedValueOnce([]);

    await expect(getCardAvailabilityExplanation("missing")).resolves.toBeNull();
  });

  it("fetches card display data, owned snapshots, and deck allocations", async () => {
    prismaMock.card.findUnique.mockResolvedValueOnce(card({ id: "query-card" }));
    prismaMock.deck.findMany.mockResolvedValueOnce([]);

    await getCardAvailabilityExplanation("query-card");

    expect(prismaMock.card.findUnique).toHaveBeenCalledWith({
      where: { id: "query-card" },
      include: {
        set: { select: { code: true, name: true } },
        translations: { orderBy: { locale: "asc" }, select: { locale: true, name: true } },
        collectionEntries: { select: { variant: true, physicalFinish: true, quantity: true } },
      },
    });
    expect(prismaMock.deck.findMany).toHaveBeenCalledWith({
      where: { allocations: { some: { cardId: "query-card" } } },
      select: {
        id: true,
        name: true,
        status: true,
        allocations: {
          where: { cardId: "query-card" },
          select: { cardId: true, variant: true, physicalFinish: true, quantity: true },
        },
      },
    });
  });

  it("supports route-safe lookup for encoded card ids", async () => {
    prismaMock.card.findUnique.mockResolvedValueOnce(null);
    prismaMock.deck.findMany.mockResolvedValueOnce([]);
    prismaMock.card.findUnique.mockResolvedValueOnce(card({ id: "set/card 1" }));
    prismaMock.deck.findMany.mockResolvedValueOnce([]);

    const explanation = await getCardAvailabilityExplanationFromRouteParam("set%2Fcard%201");

    expect(explanation?.cardId).toBe("set/card 1");
    expect(prismaMock.card.findUnique).toHaveBeenNthCalledWith(1, expect.objectContaining({ where: { id: "set%2Fcard%201" } }));
    expect(prismaMock.card.findUnique).toHaveBeenNthCalledWith(2, expect.objectContaining({ where: { id: "set/card 1" } }));
  });
});

describe("card availability explanation mapping", () => {
  it("explains foil binder reservation for common/uncommon cards with normal and foil owned", () => {
    const explanation = createCardAvailabilityExplanation(
      card({
        collectionEntries: [
          { variant: "NORMAL", quantity: 3 },
          { variant: "FOIL", quantity: 1 },
        ],
      }),
    );

    expect(explanation.rows).toMatchObject([
      { variant: "NORMAL", ownedQuantity: 3, binderReservedQuantity: 0, availableQuantity: 3, status: "AVAILABLE" },
      { variant: "FOIL", ownedQuantity: 1, binderReservedQuantity: 1, availableQuantity: 0, status: "UNAVAILABLE" },
    ]);
    expect(explanation.rows[1]?.reasons).toContain("BINDER_RESERVED_COPIES");
  });

  it("explains normal binder reservation when only normal is owned", () => {
    const explanation = createCardAvailabilityExplanation(
      card({ collectionEntries: [{ variant: "NORMAL", quantity: 2 }] }),
    );

    expect(explanation.rows[0]).toMatchObject({
      variant: "NORMAL",
      ownedQuantity: 2,
      binderReservedQuantity: 1,
      assembledDeckAllocatedQuantity: 0,
      rawAvailableQuantity: 1,
      availableQuantity: 1,
    });
  });

  it("explains assembled deck allocations and reduced availability", () => {
    const explanation = createCardAvailabilityExplanation(
      card({ id: "deck-card", collectionEntries: [{ variant: "NORMAL", quantity: 4 }] }),
      [{ deckId: "deck-alpha", deckName: "Deck Alpha", assembled: true, allocations: [{ cardId: "deck-card", variant: "NORMAL", quantity: 2 }] }],
    );

    expect(explanation.rows[0]).toMatchObject({
      variant: "NORMAL",
      ownedQuantity: 4,
      binderReservedQuantity: 1,
      assembledDeckAllocatedQuantity: 2,
      rawAvailableQuantity: 1,
      availableQuantity: 1,
      deckAllocations: [{ deckId: "deck-alpha", deckName: "Deck Alpha", variant: "NORMAL", allocatedQuantity: 2 }],
    });
  });

  it("does not reduce availability for theoretical deck allocations", () => {
    const explanation = createCardAvailabilityExplanation(
      card({ id: "theory", collectionEntries: [{ variant: "NORMAL", quantity: 4 }] }),
      [{ deckId: "theory-deck", deckName: "Theory", assembled: false, allocations: [{ cardId: "theory", variant: "NORMAL", quantity: 3 }] }],
    );

    expect(explanation.rows[0]).toMatchObject({ assembledDeckAllocatedQuantity: 0, availableQuantity: 3, deckAllocations: [] });
  });

  it("keeps duplicate deck names with the same variant distinguishable by deck id", () => {
    const explanation = createCardAvailabilityExplanation(
      card({ id: "duplicate-name-card", collectionEntries: [{ variant: "NORMAL", quantity: 5 }] }),
      [
        {
          deckId: "deck-1",
          deckName: "Même nom",
          assembled: true,
          allocations: [{ cardId: "duplicate-name-card", variant: "NORMAL", quantity: 1 }],
        },
        {
          deckId: "deck-2",
          deckName: "Même nom",
          assembled: true,
          allocations: [{ cardId: "duplicate-name-card", variant: "NORMAL", quantity: 2 }],
        },
      ],
    );

    expect(explanation.rows[0]?.deckAllocations).toMatchObject([
      { deckId: "deck-1", deckName: "Même nom", variant: "NORMAL", allocatedQuantity: 1 },
      { deckId: "deck-2", deckName: "Même nom", variant: "NORMAL", allocatedQuantity: 2 },
    ]);
  });

  it("clamps app-facing availability to 0 when reservation and allocation exceed owned", () => {
    const explanation = createCardAvailabilityExplanation(
      card({ id: "over", collectionEntries: [{ variant: "NORMAL", quantity: 1 }] }),
      [{ deckId: "over-deck", deckName: "Over", assembled: true, allocations: [{ cardId: "over", variant: "NORMAL", quantity: 2 }] }],
    );

    expect(explanation.rows[0]).toMatchObject({ rawAvailableQuantity: -2, availableQuantity: 0, status: "UNAVAILABLE" });
    expect(explanation.rows[0]?.reasons).toContain("APP_VALUE_CLAMPED_TO_ZERO");
  });

  it("does not binder-reserve showcase owned copies but allows assembled decks to reduce them", () => {
    const explanation = createCardAvailabilityExplanation(
      card({ id: "show", rarity: "EPIC", hasShowcase: true, collectionEntries: [{ variant: "SHOWCASE", quantity: 2 }] }),
      [{ deckId: "premium-deck", deckName: "Premium", assembled: true, allocations: [{ cardId: "show", variant: "SHOWCASE", quantity: 1 }] }],
    );

    expect(explanation.rows.find((row) => row.variant === "SHOWCASE")).toMatchObject({
      ownedQuantity: 2,
      binderReservedQuantity: 0,
      assembledDeckAllocatedQuantity: 1,
      availableQuantity: 1,
    });
  });

  it("treats missing valid snapshots as zero quantities", () => {
    const explanation = createCardAvailabilityExplanation(card({ id: "empty" }));

    expect(explanation.rows).toMatchObject([
      { variant: "NORMAL", ownedQuantity: 0, binderReservedQuantity: 0, assembledDeckAllocatedQuantity: 0, availableQuantity: 0 },
      { variant: "FOIL", ownedQuantity: 0, binderReservedQuantity: 0, assembledDeckAllocatedQuantity: 0, availableQuantity: 0 },
    ]);
  });

  it("throws for negative CollectionEntry quantity", () => {
    expect(() =>
      createCardAvailabilityExplanation(card({ id: "bad", collectionEntries: [{ variant: "FOIL", quantity: -1 }] })),
    ).toThrow("Invalid negative CollectionEntry quantity for card bad variant FOIL");
  });

  it("throws for invalid persisted CollectionEntry variant", () => {
    expect(() =>
      createCardAvailabilityExplanation(card({ id: "bad-rare", rarity: "RARE", collectionEntries: [{ variant: "NORMAL", quantity: 1 }] })),
    ).toThrow("Invalid CollectionEntry variant NORMAL for card bad-rare");
  });
});
