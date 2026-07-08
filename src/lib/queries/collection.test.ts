import { describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  card: {
    findMany: vi.fn(),
  },
  deck: {
    findMany: vi.fn(),
  },
}));

vi.mock("../db", () => ({
  prisma: prismaMock,
}));
import {
  createCollectionRows,
  getCollectionPageData,
  getDisplayCardName,
  summarizeCollectionRows,
  type CollectionCardRecord,
} from "./collection";

function card(overrides: Partial<CollectionCardRecord>): CollectionCardRecord {
  return {
    id: "card-1",
    name: "Base Name",
    collectorNumber: "001",
    rarity: "COMMON",
    kind: "GAMEPLAY",
    printTreatment: "REGULAR",
    hasShowcase: false,
    set: { code: "ORG", name: "Origins" },
    translations: [],
    collectionEntries: [],
    ...overrides,
  };
}

describe("collection query", () => {
  it("fetches only trackable GAMEPLAY and ENERGY cards from Prisma", async () => {
    prismaMock.card.findMany.mockResolvedValueOnce([]);
    prismaMock.deck.findMany.mockResolvedValueOnce([]);

    const { rows, summary } = await getCollectionPageData();

    expect(prismaMock.card.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { kind: { in: ["GAMEPLAY", "ENERGY"] } },
      }),
    );
    expect(prismaMock.deck.findMany).toHaveBeenCalledWith({
      where: { status: "ASSEMBLED" },
      select: {
        allocations: {
          select: { cardId: true, variant: true, physicalFinish: true, quantity: true },
        },
      },
    });
    expect(rows).toEqual([]);
    expect(summary).toEqual({
      totalOwnedCopies: 0,
      ownedRows: 0,
      trackableRows: 0,
      missingRows: 0,
    });
  });

  it("loads assembled deck allocations when composing page availability", async () => {
    prismaMock.card.findMany.mockResolvedValueOnce([
      card({
        id: "deck-card",
        collectionEntries: [{ variant: "NORMAL", quantity: 3 }],
      }),
    ]);
    prismaMock.deck.findMany.mockResolvedValueOnce([
      {
        allocations: [{ cardId: "deck-card", variant: "NORMAL", quantity: 2 }],
      },
    ]);

    const { rows } = await getCollectionPageData();

    expect(rows.find((row) => row.variant === "NORMAL")).toMatchObject({
      ownedQuantity: 3,
      binderReservedQuantity: 1,
      availableQuantity: 0,
    });
  });
});

describe("collection query mapping", () => {
  it("includes trackable cards and excludes TOKEN/RULES cards", () => {
    const rows = createCollectionRows([
      card({ id: "gameplay", kind: "GAMEPLAY" }),
      card({ id: "energy", kind: "ENERGY", rarity: "UNKNOWN" }),
      card({ id: "token", kind: "TOKEN" }),
      card({ id: "rules", kind: "RULES" }),
    ]);

    expect(rows.map((row) => row.cardId)).toEqual([
      "gameplay",
      "gameplay",
      "energy",
    ]);
  });

  it("creates allowed variant rows without introducing showcase foil", () => {
    const rows = createCollectionRows([
      card({ id: "common", rarity: "COMMON" }),
      card({ id: "rare", rarity: "RARE" }),
      card({ id: "showcase", rarity: "EPIC", hasShowcase: true }),
    ]);

    expect(
      rows.filter((row) => row.cardId === "common").map((row) => row.variant),
    ).toEqual(["NORMAL", "FOIL"]);
    expect(
      rows.filter((row) => row.cardId === "rare").map((row) => row.variant),
    ).toEqual(["FOIL"]);
    expect(
      rows.filter((row) => row.cardId === "showcase").map((row) => row.variant),
    ).toEqual(["FOIL", "SHOWCASE"]);
  });

  it("reads normal and foil quantities from physicalFinish when present", () => {
    const rows = createCollectionRows([
      card({
        id: "finish-owned-card",
        collectionEntries: [
          { variant: "FOIL", physicalFinish: "NORMAL", quantity: 2 },
          { variant: "NORMAL", physicalFinish: "FOIL", quantity: 1 },
        ],
      }),
    ]);

    expect(rows).toMatchObject([
      { variant: "NORMAL", ownedQuantity: 2, binderReservedQuantity: 0, availableQuantity: 2 },
      { variant: "FOIL", ownedQuantity: 1, binderReservedQuantity: 1, availableQuantity: 0 },
    ]);
  });

  it("falls back to legacy normal and foil variants when physicalFinish is null", () => {
    const rows = createCollectionRows([
      card({
        id: "legacy-owned-card",
        collectionEntries: [
          { variant: "NORMAL", physicalFinish: null, quantity: 2 },
          { variant: "FOIL", physicalFinish: null, quantity: 1 },
        ],
      }),
    ]);

    expect(rows).toMatchObject([
      { variant: "NORMAL", ownedQuantity: 2 },
      { variant: "FOIL", ownedQuantity: 1 },
    ]);
  });

  it("ignores legacy showcase compatibility rows for standard normal and foil ownership", () => {
    const rows = createCollectionRows([
      card({
        id: "legacy-showcase-row",
        hasShowcase: false,
        collectionEntries: [{ variant: "SHOWCASE", physicalFinish: null, quantity: 5 }],
      }),
    ]);

    expect(rows).toMatchObject([
      { variant: "NORMAL", ownedQuantity: 0 },
      { variant: "FOIL", ownedQuantity: 0 },
    ]);
  });

  it("maps existing snapshots and renders missing entries as quantity 0", () => {
    const rows = createCollectionRows([
      card({
        id: "owned-card",
        collectionEntries: [{ variant: "FOIL", quantity: 3 }],
      }),
    ]);

    expect(rows).toMatchObject([
      {
        cardId: "owned-card",
        variant: "NORMAL",
        ownedQuantity: 0,
        binderReservedQuantity: 0,
        availableQuantity: 0,
      },
      {
        cardId: "owned-card",
        variant: "FOIL",
        ownedQuantity: 3,
        binderReservedQuantity: 1,
        availableQuantity: 2,
      },
    ]);
  });

  it("reserves foil first for common and uncommon rows, then computes availability", () => {
    const rows = createCollectionRows([
      card({
        id: "common-foil-first",
        rarity: "COMMON",
        collectionEntries: [
          { variant: "NORMAL", quantity: 3 },
          { variant: "FOIL", quantity: 1 },
        ],
      }),
    ]);

    expect(rows).toMatchObject([
      {
        variant: "NORMAL",
        ownedQuantity: 3,
        binderReservedQuantity: 0,
        availableQuantity: 3,
      },
      {
        variant: "FOIL",
        ownedQuantity: 1,
        binderReservedQuantity: 1,
        availableQuantity: 0,
      },
    ]);
  });

  it("reserves normal for common and uncommon cards when only normal is owned", () => {
    const rows = createCollectionRows([
      card({
        id: "common-normal",
        rarity: "UNCOMMON",
        collectionEntries: [{ variant: "NORMAL", quantity: 2 }],
      }),
    ]);

    expect(rows).toMatchObject([
      {
        variant: "NORMAL",
        ownedQuantity: 2,
        binderReservedQuantity: 1,
        availableQuantity: 1,
      },
      {
        variant: "FOIL",
        ownedQuantity: 0,
        binderReservedQuantity: 0,
        availableQuantity: 0,
      },
    ]);
  });

  it("reserves foil for rare, epic, and ultimate foil-only cards", () => {
    const rows = createCollectionRows([
      card({
        id: "rare-foil",
        rarity: "RARE",
        collectionEntries: [{ variant: "FOIL", quantity: 2 }],
      }),
      card({
        id: "epic-foil",
        rarity: "EPIC",
        collectionEntries: [{ variant: "FOIL", quantity: 1 }],
      }),
      card({
        id: "ultimate-foil",
        rarity: "ULTIMATE",
        collectionEntries: [{ variant: "FOIL", quantity: 3 }],
      }),
    ]);

    expect(
      rows.map(
        ({
          cardId,
          variant,
          ownedQuantity,
          binderReservedQuantity,
          availableQuantity,
        }) => ({
          cardId,
          variant,
          ownedQuantity,
          binderReservedQuantity,
          availableQuantity,
        }),
      ),
    ).toEqual([
      {
        cardId: "rare-foil",
        variant: "FOIL",
        ownedQuantity: 2,
        binderReservedQuantity: 1,
        availableQuantity: 1,
      },
      {
        cardId: "epic-foil",
        variant: "FOIL",
        ownedQuantity: 1,
        binderReservedQuantity: 1,
        availableQuantity: 0,
      },
      {
        cardId: "ultimate-foil",
        variant: "FOIL",
        ownedQuantity: 3,
        binderReservedQuantity: 1,
        availableQuantity: 2,
      },
    ]);
  });

  it("never auto-reserves showcase and leaves owned showcase available", () => {
    const rows = createCollectionRows([
      card({
        id: "showcase-owned",
        rarity: "EPIC",
        hasShowcase: true,
        collectionEntries: [{ variant: "SHOWCASE", quantity: 1 }],
      }),
    ]);

    expect(rows).toMatchObject([
      {
        variant: "FOIL",
        ownedQuantity: 0,
        binderReservedQuantity: 0,
        availableQuantity: 0,
      },
      {
        variant: "SHOWCASE",
        ownedQuantity: 1,
        binderReservedQuantity: 0,
        availableQuantity: 1,
      },
    ]);
  });

  it("subtracts assembled deck allocations from available quantity", () => {
    const rows = createCollectionRows(
      [
        card({
          id: "assembled-card",
          collectionEntries: [{ variant: "NORMAL", quantity: 4 }],
        }),
      ],
      [
        {
          assembled: true,
          allocations: [
            { cardId: "assembled-card", variant: "NORMAL", quantity: 2 },
          ],
        },
      ],
    );

    expect(rows.find((row) => row.variant === "NORMAL")).toMatchObject({
      ownedQuantity: 4,
      binderReservedQuantity: 1,
      availableQuantity: 1,
    });
  });

  it("does not subtract theoretical deck allocations from available quantity", () => {
    const rows = createCollectionRows(
      [
        card({
          id: "theory-card",
          collectionEntries: [{ variant: "NORMAL", quantity: 4 }],
        }),
      ],
      [
        {
          assembled: false,
          allocations: [
            { cardId: "theory-card", variant: "NORMAL", quantity: 2 },
          ],
        },
      ],
    );

    expect(rows.find((row) => row.variant === "NORMAL")).toMatchObject({
      ownedQuantity: 4,
      binderReservedQuantity: 1,
      availableQuantity: 3,
    });
  });

  it("clamps availability to 0 when binder reservation plus assembled allocation exceeds owned", () => {
    const rows = createCollectionRows(
      [
        card({
          id: "clamped-card",
          collectionEntries: [{ variant: "NORMAL", quantity: 1 }],
        }),
      ],
      [
        {
          assembled: true,
          allocations: [
            { cardId: "clamped-card", variant: "NORMAL", quantity: 2 },
          ],
        },
      ],
    );

    expect(rows.find((row) => row.variant === "NORMAL")).toMatchObject({
      ownedQuantity: 1,
      binderReservedQuantity: 1,
      availableQuantity: 0,
    });
  });

  it("keeps ENERGY trackable in ownership and availability rows", () => {
    const rows = createCollectionRows([
      card({
        id: "energy-card",
        kind: "ENERGY",
        rarity: "UNKNOWN",
        collectionEntries: [{ variant: "FOIL", quantity: 2 }],
      }),
    ]);

    expect(rows).toMatchObject([
      {
        cardId: "energy-card",
        variant: "FOIL",
        ownedQuantity: 2,
        binderReservedQuantity: 1,
        availableQuantity: 1,
      },
    ]);
  });

  it("surfaces negative CollectionEntry snapshots as invalid data", () => {
    expect(() =>
      createCollectionRows([
        card({
          id: "bad-card",
          collectionEntries: [{ variant: "FOIL", quantity: -1 }],
        }),
      ]),
    ).toThrow(
      "Invalid negative CollectionEntry quantity for card bad-card variant FOIL",
    );
  });

  it("surfaces NORMAL snapshots on foil-only cards as invalid persisted data", () => {
    expect(() =>
      createCollectionRows([
        card({
          id: "bad-rare",
          rarity: "RARE",
          collectionEntries: [{ variant: "NORMAL", quantity: 1 }],
        }),
      ]),
    ).toThrow("Invalid CollectionEntry variant NORMAL for card bad-rare");
  });

  it("uses deterministic translation fallback order", () => {
    expect(
      getDisplayCardName(
        card({
          name: "Base Name",
          translations: [
            { locale: "en-US", name: "English Name" },
            { locale: "fr", name: "Nom français" },
            { locale: "fr-FR", name: "Nom France" },
          ],
        }),
      ),
    ).toBe("Nom France");

    expect(
      getDisplayCardName(
        card({ translations: [{ locale: "de", name: "Deutsch" }] }),
      ),
    ).toBe("Base Name");
  });

  it("summarizes owned, trackable, and missing rows", () => {
    const rows = createCollectionRows([
      card({
        id: "first",
        collectionEntries: [{ variant: "NORMAL", quantity: 2 }],
      }),
      card({ id: "second", rarity: "RARE" }),
    ]);

    expect(summarizeCollectionRows(rows)).toEqual({
      totalOwnedCopies: 2,
      ownedRows: 1,
      trackableRows: 3,
      missingRows: 2,
    });
  });
});
