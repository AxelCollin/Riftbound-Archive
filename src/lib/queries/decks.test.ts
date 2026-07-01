import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  deck: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
  },
  card: {
    findMany: vi.fn(),
  },
}));

vi.mock("../db", () => ({
  prisma: prismaMock,
}));

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.deck.findMany.mockResolvedValue([]);
  prismaMock.card.findMany.mockResolvedValue([]);
});

import {
  createDeckListRows,
  getDeckListPageData,
  summarizeDeckListRows,
  type DeckRequirementRow,
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
    prismaMock.card.findMany.mockResolvedValueOnce([]);
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
    prismaMock.card.findMany.mockResolvedValueOnce([]);
    prismaMock.deck.findUnique.mockResolvedValueOnce(detailDeck());
    const { getDeckDetailPageData } = await import("./decks");

    await expect(getDeckDetailPageData("deck-detail")).resolves.toMatchObject({
      requirements: [],
      allocations: [],
      summary: { requirementLineCount: 0, requiredCardQuantity: 0, allocationLineCount: 0, allocatedCardQuantity: 0 },
    });
  });

  it("sorts requirements and allocations deterministically", async () => {
    prismaMock.card.findMany.mockResolvedValueOnce([]);
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

  it("includes sorted serializable cardOptions for trackable cards", async () => {
    prismaMock.deck.findUnique.mockResolvedValueOnce(detailDeck());
    prismaMock.card.findMany.mockResolvedValueOnce([
      cardRecord({ id: "card-b", name: "Beta", collectorNumber: "010", set: { code: "SET2", name: "Set Two" }, kind: "ENERGY", rarity: "RARE" }),
      cardRecord({ id: "card-a", name: "Alpha", collectorNumber: "002", translations: [{ locale: "fr-FR", name: "Alpha FR" }] }),
    ]);
    const { getDeckDetailPageData } = await import("./decks");
    const data = await getDeckDetailPageData("deck-detail");

    expect(prismaMock.card.findMany).toHaveBeenCalledWith({
      where: { kind: { in: ["GAMEPLAY", "ENERGY"] } },
      select: expect.any(Object),
    });
    expect(data?.cardOptions.map((option) => option.cardId)).toEqual(["card-a", "card-b"]);
    expect(data?.cardOptions[0]).toMatchObject({ displayName: "Alpha FR", allowedPreferences: ["ANY", "NORMAL", "FOIL"] });
    expect(data?.cardOptions[1]).toMatchObject({ displayName: "Beta", allowedPreferences: ["ANY", "FOIL"] });
    expect(JSON.parse(JSON.stringify(data?.cardOptions))).toEqual(data?.cardOptions);
  });

  it("computes card option preferences from trackable card capabilities", async () => {
    prismaMock.deck.findUnique.mockResolvedValueOnce(detailDeck());
    prismaMock.card.findMany.mockResolvedValueOnce([
      cardRecord({ id: "common", name: "Common", rarity: "COMMON", kind: "GAMEPLAY", hasShowcase: false }),
      cardRecord({ id: "uncommon", name: "Uncommon", rarity: "UNCOMMON", kind: "GAMEPLAY", hasShowcase: false }),
      cardRecord({ id: "rare", name: "Rare", rarity: "RARE", kind: "GAMEPLAY", hasShowcase: false }),
      cardRecord({ id: "energy", name: "Energy", rarity: "UNKNOWN", kind: "ENERGY", hasShowcase: false }),
      cardRecord({ id: "showcase", name: "Showcase", rarity: "EPIC", kind: "GAMEPLAY", hasShowcase: true }),
    ]);
    const { getDeckDetailPageData } = await import("./decks");
    const data = await getDeckDetailPageData("deck-detail");
    const preferencesByCardId = new Map(data?.cardOptions.map((option) => [option.cardId, option.allowedPreferences]));

    expect(preferencesByCardId.get("common")).toEqual(["ANY", "NORMAL", "FOIL"]);
    expect(preferencesByCardId.get("uncommon")).toEqual(["ANY", "NORMAL", "FOIL"]);
    expect(preferencesByCardId.get("rare")).toEqual(["ANY", "FOIL"]);
    expect(preferencesByCardId.get("energy")).toEqual(["ANY", "FOIL"]);
    expect(preferencesByCardId.get("showcase")).toEqual(["ANY", "FOIL", "SHOWCASE"]);
  });


  it("excludes the current assembled deck from missing-card availability subtraction", async () => {
    prismaMock.deck.findUnique.mockResolvedValueOnce(detailDeck({
      status: "ASSEMBLED",
      deckCards: [
        {
          id: "dc-current",
          cardId: "card-1",
          quantity: 2,
          preferredVariant: "ANY",
          card: cardRecord({ collectionEntries: [{ variant: "NORMAL", quantity: 3 }] }),
        },
      ],
      allocations: [
        { id: "alloc-current", cardId: "card-1", variant: "NORMAL", quantity: 2, card: cardRecord() },
      ],
    }));
    prismaMock.card.findMany.mockResolvedValueOnce([]);
    prismaMock.deck.findMany.mockResolvedValueOnce([]);
    const { getDeckDetailPageData } = await import("./decks");

    const data = await getDeckDetailPageData("deck-detail");

    expect(data?.missing.rows[0]).toMatchObject({
      cardId: "card-1",
      requiredQuantity: 2,
      satisfiedQuantity: 2,
      missingQuantity: 0,
      usedVariants: [{ variant: "NORMAL", quantity: 2 }],
    });
  });

  it("still subtracts other assembled deck allocations from missing-card availability", async () => {
    prismaMock.deck.findUnique.mockResolvedValueOnce(detailDeck({
      status: "ASSEMBLED",
      deckCards: [
        {
          id: "dc-current",
          cardId: "card-1",
          quantity: 2,
          preferredVariant: "ANY",
          card: cardRecord({ collectionEntries: [{ variant: "NORMAL", quantity: 4 }] }),
        },
      ],
      allocations: [
        { id: "alloc-current", cardId: "card-1", variant: "NORMAL", quantity: 2, card: cardRecord() },
      ],
    }));
    prismaMock.card.findMany.mockResolvedValueOnce([]);
    prismaMock.deck.findMany.mockResolvedValueOnce([
      { allocations: [{ cardId: "card-1", variant: "NORMAL", quantity: 2 }] },
    ]);
    const { getDeckDetailPageData } = await import("./decks");

    const data = await getDeckDetailPageData("deck-detail");

    expect(data?.missing.rows[0]).toMatchObject({
      cardId: "card-1",
      requiredQuantity: 2,
      satisfiedQuantity: 1,
      missingQuantity: 1,
      usedVariants: [{ variant: "NORMAL", quantity: 1 }],
    });
  });

  it("filters assembled-deck allocation reads by excluding the current deck id", async () => {
    prismaMock.deck.findUnique.mockResolvedValueOnce(detailDeck());
    prismaMock.card.findMany.mockResolvedValueOnce([]);
    prismaMock.deck.findMany.mockResolvedValueOnce([]);
    const { getDeckDetailPageData } = await import("./decks");

    await getDeckDetailPageData("deck-detail");

    expect(prismaMock.deck.findMany).toHaveBeenLastCalledWith({
      where: { status: "ASSEMBLED", id: { not: "deck-detail" } },
      select: { allocations: { select: { cardId: true, variant: true, quantity: true } } },
    });
  });

  it("keeps deck detail missing-card composition read-only with no Prisma writes", async () => {
    prismaMock.deck.findUnique.mockResolvedValueOnce(detailDeck());
    prismaMock.card.findMany.mockResolvedValueOnce([]);
    prismaMock.deck.findMany.mockResolvedValueOnce([]);
    const { getDeckDetailPageData } = await import("./decks");

    await getDeckDetailPageData("deck-detail");

    expect(prismaMock.deck).not.toHaveProperty("create");
    expect(prismaMock.deck).not.toHaveProperty("update");
    expect(prismaMock.deck).not.toHaveProperty("delete");
    expect(prismaMock).not.toHaveProperty("deckCardAllocation");
  });

  it("includes allowedPreferences on requirement rows", async () => {
    prismaMock.card.findMany.mockResolvedValueOnce([]);
    prismaMock.deck.findUnique.mockResolvedValueOnce(detailDeck({
      deckCards: [
        { id: "dc-common", cardId: "common", quantity: 1, preferredVariant: "NORMAL", card: cardRecord({ id: "common", rarity: "COMMON", hasShowcase: false }) },
        { id: "dc-showcase", cardId: "showcase", quantity: 1, preferredVariant: "SHOWCASE", card: cardRecord({ id: "showcase", rarity: "RARE", hasShowcase: true }) },
      ],
    }));
    const { getDeckDetailPageData } = await import("./decks");
    const data = await getDeckDetailPageData("deck-detail");

    expect(data?.requirements).toEqual(expect.arrayContaining([
      expect.objectContaining({ deckCardId: "dc-common", allowedPreferences: ["ANY", "NORMAL", "FOIL"] }),
      expect.objectContaining({ deckCardId: "dc-showcase", allowedPreferences: ["ANY", "FOIL", "SHOWCASE"] }),
    ]));
  });

});


describe("deck missing detail composition", () => {
  function baseRequirement(overrides: Partial<DeckRequirementRow> = {}): DeckRequirementRow {
    return {
      deckCardId: "dc-1",
      cardId: "card-1",
      displayName: "Carte Un",
      officialName: "Card One",
      collectorNumber: "001",
      rarity: "COMMON" as const,
      kind: "GAMEPLAY" as const,
      printTreatment: "REGULAR" as const,
      hasShowcase: true,
      set: { code: "SET1", name: "Set One" },
      preferredVariant: "ANY" as const,
      allowedPreferences: ["ANY", "NORMAL", "FOIL", "SHOWCASE"],
      quantity: 2,
      collectionEntries: [],
      ...overrides,
    };
  }

  it("returns empty missing rows and a complete summary for a deck with no requirements", async () => {
    const { createDeckMissingDetail } = await import("./decks");

    expect(createDeckMissingDetail([])).toEqual({
      rows: [],
      summary: {
        requirementLineCount: 0,
        completeLineCount: 0,
        missingLineCount: 0,
        requiredCardQuantity: 0,
        satisfiedCardQuantity: 0,
        missingCardQuantity: 0,
        isComplete: true,
      },
    });
  });

  it("marks a fully satisfied deck complete and surfaces used variants read-only", async () => {
    const { createDeckMissingDetail } = await import("./decks");
    const data = createDeckMissingDetail([baseRequirement({ quantity: 2, collectionEntries: [{ variant: "NORMAL", quantity: 3 }] })]);

    expect(data.summary).toMatchObject({ missingCardQuantity: 0, satisfiedCardQuantity: 2, isComplete: true });
    expect(data.rows[0]).toMatchObject({ cardId: "card-1", displayName: "Carte Un", requiredQuantity: 2, satisfiedQuantity: 2, missingQuantity: 0, usedVariants: [{ variant: "NORMAL", quantity: 2 }] });
  });

  it("shows correct partial missing quantities and summary totals", async () => {
    const { createDeckMissingDetail } = await import("./decks");
    const data = createDeckMissingDetail([baseRequirement({ quantity: 4, collectionEntries: [{ variant: "NORMAL", quantity: 2 }] })]);

    expect(data.summary).toEqual({ requirementLineCount: 1, completeLineCount: 0, missingLineCount: 1, requiredCardQuantity: 4, satisfiedCardQuantity: 1, missingCardQuantity: 3, isComplete: false });
    expect(data.rows[0]).toMatchObject({ requiredQuantity: 4, satisfiedQuantity: 1, missingQuantity: 3 });
  });

  it("uses only the exact preferred variant for exact requirements", async () => {
    const { createDeckMissingDetail } = await import("./decks");
    const data = createDeckMissingDetail([baseRequirement({ preferredVariant: "FOIL", quantity: 2, collectionEntries: [{ variant: "NORMAL", quantity: 10 }, { variant: "FOIL", quantity: 2 }] })]);

    expect(data.rows[0]).toMatchObject({ satisfiedQuantity: 1, missingQuantity: 1, usedVariants: [{ variant: "FOIL", quantity: 1 }] });
  });

  it("lets ANY use availability in preserve-premium order after binder reservation", async () => {
    const { createDeckMissingDetail } = await import("./decks");
    const data = createDeckMissingDetail([baseRequirement({ quantity: 3, collectionEntries: [{ variant: "NORMAL", quantity: 2 }, { variant: "FOIL", quantity: 2 }, { variant: "SHOWCASE", quantity: 2 }] })]);

    expect(data.rows[0].usedVariants).toEqual([{ variant: "NORMAL", quantity: 2 }, { variant: "FOIL", quantity: 1 }]);
  });

  it("includes card display data in missing rows", async () => {
    const { createDeckMissingDetail } = await import("./decks");
    const data = createDeckMissingDetail([baseRequirement({ displayName: "Nom FR", set: { code: "ORG", name: "Origines" }, collectorNumber: "123" })]);

    expect(data.rows[0]).toMatchObject({ displayName: "Nom FR", set: { code: "ORG", name: "Origines" }, collectorNumber: "123" });
  });

  it("uses current available counts instead of owned counts by subtracting assembled allocations", async () => {
    const { createDeckMissingDetail } = await import("./decks");
    const data = createDeckMissingDetail(
      [baseRequirement({ quantity: 2, collectionEntries: [{ variant: "NORMAL", quantity: 4 }] })],
      [{ assembled: true, allocations: [{ cardId: "card-1", variant: "NORMAL", quantity: 2 }] }],
    );

    expect(data.rows[0]).toMatchObject({ satisfiedQuantity: 1, missingQuantity: 1 });
  });

  it("does not require persisted allocations to exist and does not call Prisma writes", async () => {
    const { createDeckMissingDetail } = await import("./decks");
    const data = createDeckMissingDetail([baseRequirement({ collectionEntries: [{ variant: "NORMAL", quantity: 2 }] })]);

    expect(data.summary.isComplete).toBe(false);
    expect(Object.keys(prismaMock.deck)).toEqual(["findMany", "findUnique"]);
  });
});
