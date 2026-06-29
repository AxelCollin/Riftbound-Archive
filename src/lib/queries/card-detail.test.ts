import { describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  card: {
    findUnique: vi.fn(),
  },
  deck: {
    findMany: vi.fn(),
  },
}));

vi.mock("../db", () => ({
  prisma: prismaMock,
}));

import {
  createCardDetail,
  getCardDetail,
  type CardDetailRecord,
} from "./card-detail";

function card(overrides: Partial<CardDetailRecord>): CardDetailRecord {
  return {
    id: "card-1",
    name: "Base Name",
    collectorNumber: "001",
    rarity: "COMMON",
    kind: "GAMEPLAY",
    printTreatment: "REGULAR",
    hasShowcase: false,
    officialRarityRaw: null,
    printTreatmentRaw: null,
    officialImageUrl: null,
    officialArtist: null,
    set: { code: "ORG", name: "Origins" },
    translations: [],
    collectionEntries: [],
    userMeta: null,
    ...overrides,
  };
}

describe("card detail mapping", () => {
  it("returns the preferred display name using translation fallback", () => {
    const detail = createCardDetail(
      card({
        translations: [
          {
            locale: "en-US",
            name: "English Name",
            subtitle: null,
            rulesText: null,
            flavorText: null,
          },
          {
            locale: "fr",
            name: "Nom français",
            subtitle: null,
            rulesText: null,
            flavorText: null,
          },
          {
            locale: "fr-FR",
            name: "Nom France",
            subtitle: null,
            rulesText: null,
            flavorText: null,
          },
        ],
      }),
    );

    expect(detail.displayName).toBe("Nom France");
  });

  it("shows quantity 0 for allowed variants without snapshots", () => {
    const detail = createCardDetail(
      card({
        rarity: "COMMON",
        collectionEntries: [{ variant: "FOIL", quantity: 2 }],
      }),
    );

    expect(detail.ownershipRows).toEqual([
      {
        variant: "NORMAL",
        ownedQuantity: 0,
        binderReservedQuantity: 0,
        availableQuantity: 0,
      },
      {
        variant: "FOIL",
        ownedQuantity: 2,
        binderReservedQuantity: 1,
        availableQuantity: 1,
      },
    ]);
  });

  it("maps existing CollectionEntry snapshots to the matching variant row", () => {
    const detail = createCardDetail(
      card({
        rarity: "EPIC",
        hasShowcase: true,
        collectionEntries: [
          { variant: "FOIL", quantity: 1 },
          { variant: "SHOWCASE", quantity: 3 },
        ],
      }),
    );

    expect(detail.ownershipRows).toEqual([
      {
        variant: "FOIL",
        ownedQuantity: 1,
        binderReservedQuantity: 1,
        availableQuantity: 0,
      },
      {
        variant: "SHOWCASE",
        ownedQuantity: 3,
        binderReservedQuantity: 0,
        availableQuantity: 3,
      },
    ]);
  });

  it("maps missing valid snapshots to coherent owned, reserved, and available quantities", () => {
    const detail = createCardDetail(card({ rarity: "COMMON" }));

    expect(detail.ownershipRows).toEqual([
      {
        variant: "NORMAL",
        ownedQuantity: 0,
        binderReservedQuantity: 0,
        availableQuantity: 0,
      },
      {
        variant: "FOIL",
        ownedQuantity: 0,
        binderReservedQuantity: 0,
        availableQuantity: 0,
      },
    ]);
  });

  it("keeps showcase available without automatic binder reservation", () => {
    const detail = createCardDetail(
      card({
        rarity: "EPIC",
        hasShowcase: true,
        collectionEntries: [{ variant: "SHOWCASE", quantity: 1 }],
      }),
    );

    expect(detail.ownershipRows).toEqual([
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

  it("subtracts assembled deck allocations from ownership row availability", () => {
    const detail = createCardDetail(
      card({
        id: "detail-deck-card",
        collectionEntries: [{ variant: "NORMAL", quantity: 4 }],
      }),
      [
        {
          assembled: true,
          allocations: [
            { cardId: "detail-deck-card", variant: "NORMAL", quantity: 2 },
          ],
        },
      ],
    );

    expect(detail.ownershipRows).toEqual([
      {
        variant: "NORMAL",
        ownedQuantity: 4,
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

  it("keeps showcase copies unreserved by binder but reduced by assembled deck allocations", () => {
    const detail = createCardDetail(
      card({
        id: "showcase-deck-card",
        rarity: "EPIC",
        hasShowcase: true,
        collectionEntries: [{ variant: "SHOWCASE", quantity: 2 }],
      }),
      [
        {
          assembled: true,
          allocations: [
            { cardId: "showcase-deck-card", variant: "SHOWCASE", quantity: 1 },
          ],
        },
      ],
    );

    expect(detail.ownershipRows).toEqual([
      {
        variant: "FOIL",
        ownedQuantity: 0,
        binderReservedQuantity: 0,
        availableQuantity: 0,
      },
      {
        variant: "SHOWCASE",
        ownedQuantity: 2,
        binderReservedQuantity: 0,
        availableQuantity: 1,
      },
    ]);
  });

  it("loads assembled deck allocations for the requested card detail", async () => {
    prismaMock.card.findUnique.mockResolvedValueOnce(
      card({
        id: "db-detail-card",
        collectionEntries: [{ variant: "NORMAL", quantity: 3 }],
      }),
    );
    prismaMock.deck.findMany.mockResolvedValueOnce([
      {
        allocations: [
          { cardId: "db-detail-card", variant: "NORMAL", quantity: 1 },
        ],
      },
    ]);

    const detail = await getCardDetail("db-detail-card");

    expect(prismaMock.deck.findMany).toHaveBeenCalledWith({
      where: {
        status: "ASSEMBLED",
        allocations: { some: { cardId: "db-detail-card" } },
      },
      select: {
        allocations: {
          where: { cardId: "db-detail-card" },
          select: { cardId: true, variant: true, quantity: true },
        },
      },
    });
    expect(
      detail?.ownershipRows.find((row) => row.variant === "NORMAL"),
    ).toMatchObject({
      ownedQuantity: 3,
      binderReservedQuantity: 1,
      availableQuantity: 1,
    });
  });

  it("surfaces negative CollectionEntry snapshots as invalid data", () => {
    expect(() =>
      createCardDetail(
        card({
          id: "bad-detail-card",
          collectionEntries: [{ variant: "NORMAL", quantity: -2 }],
        }),
      ),
    ).toThrow(
      "Invalid negative CollectionEntry quantity for card bad-detail-card variant NORMAL",
    );
  });

  it("surfaces NORMAL snapshots on foil-only cards as invalid persisted data", () => {
    expect(() =>
      createCardDetail(
        card({
          id: "bad-detail-rare",
          rarity: "RARE",
          collectionEntries: [{ variant: "NORMAL", quantity: 1 }],
        }),
      ),
    ).toThrow(
      "Invalid CollectionEntry variant NORMAL for card bad-detail-rare",
    );
  });

  it("surfaces SHOWCASE snapshots on non-showcase cards as invalid persisted data", () => {
    expect(() =>
      createCardDetail(
        card({
          id: "bad-detail-showcase",
          hasShowcase: false,
          collectionEntries: [{ variant: "SHOWCASE", quantity: 1 }],
        }),
      ),
    ).toThrow(
      "Invalid CollectionEntry variant SHOWCASE for card bad-detail-showcase",
    );
  });

  it("marks TOKEN and RULES cards as non-trackable without ownership variants", () => {
    expect(createCardDetail(card({ kind: "TOKEN" })).ownershipRows).toEqual([]);
    expect(createCardDetail(card({ kind: "RULES" })).isTrackable).toBe(false);
  });
});
