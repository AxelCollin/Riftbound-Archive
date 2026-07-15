import { describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  card: {
    findUnique: vi.fn(),
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
  createCardDetail,
  getCardDetail,
  type CardDetail,
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

function ownershipRows(detail: CardDetail) {
  const rows = [
    { variant: "NORMAL" as const, ...detail.possession.normal },
    { variant: "FOIL" as const, ...detail.possession.foil },
  ];

  return detail.possession.legacyShowcaseCompatibility
    ? [...rows.filter((row) => row.variant !== "NORMAL" || row.ownedQuantity > 0 || row.binderReservedQuantity > 0 || row.availableQuantity > 0), { variant: "SHOWCASE" as const, ...detail.possession.legacyShowcaseCompatibility }]
    : rows;
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

    expect(detail.printing.displayName).toBe("Nom France");
  });

  it("reads normal and foil ownership rows from physicalFinish when present", () => {
    const detail = createCardDetail(
      card({
        rarity: "COMMON",
        collectionEntries: [
          { variant: "FOIL", physicalFinish: "NORMAL", quantity: 2 },
          { variant: "NORMAL", physicalFinish: "FOIL", quantity: 1 },
        ],
      }),
    );

    expect(ownershipRows(detail)).toEqual([
      { variant: "NORMAL", ownedQuantity: 2, binderReservedQuantity: 0, availableQuantity: 2 },
      { variant: "FOIL", ownedQuantity: 1, binderReservedQuantity: 1, availableQuantity: 0 },
    ]);
  });

  it("does not crash or count legacy showcase rows as normal or foil ownership", () => {
    const detail = createCardDetail(
      card({
        rarity: "COMMON",
        hasShowcase: false,
        collectionEntries: [{ variant: "SHOWCASE", physicalFinish: null, quantity: 3 }],
      }),
    );

    expect(detail.possession.normal).toEqual({ ownedQuantity: 0, binderReservedQuantity: 0, availableQuantity: 0 });
    expect(detail.possession.foil).toEqual({ ownedQuantity: 0, binderReservedQuantity: 0, availableQuantity: 0 });
    expect(detail.possession.legacyShowcaseCompatibility).toEqual({ ownedQuantity: 3, binderReservedQuantity: 0, availableQuantity: 3 });
  });

  it("aggregates physical card languages for current language-agnostic ownership rows", () => {
    const detail = createCardDetail(
      card({
        rarity: "COMMON",
        collectionEntries: [
          { variant: "NORMAL", physicalFinish: "NORMAL", cardLanguage: "FR", quantity: 1 },
          { variant: "NORMAL", physicalFinish: "NORMAL", cardLanguage: "EN", quantity: 2 },
          { variant: "NORMAL", physicalFinish: "NORMAL", cardLanguage: "ZH", quantity: 3 },
        ],
      }),
    );

    expect(ownershipRows(detail)[0]).toMatchObject({ variant: "NORMAL", ownedQuantity: 6, availableQuantity: 5 });
  });

  it("shows quantity 0 for allowed variants without snapshots", () => {
    const detail = createCardDetail(
      card({
        rarity: "COMMON",
        collectionEntries: [{ variant: "FOIL", quantity: 2 }],
      }),
    );

    expect(ownershipRows(detail)).toEqual([
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

    expect(ownershipRows(detail)).toEqual([
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

    expect(ownershipRows(detail)).toEqual([
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

    expect(ownershipRows(detail)).toEqual([
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

    expect(ownershipRows(detail)).toEqual([
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

    expect(ownershipRows(detail)).toEqual([
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


  it("allows Common and Uncommon Normal and Foil ownership but keeps Rare and Epic Foil-only", () => {
    for (const rarity of ["COMMON", "UNCOMMON"] as const) {
      const detail = createCardDetail(card({ rarity, collectionEntries: [{ variant: "NORMAL", quantity: 1 }, { variant: "FOIL", quantity: 2 }] }));
      expect(detail.possession.normal.ownedQuantity).toBe(1);
      expect(detail.possession.foil.ownedQuantity).toBe(2);
    }

    for (const rarity of ["RARE", "EPIC"] as const) {
      const detail = createCardDetail(card({ rarity, collectionEntries: [{ variant: "FOIL", quantity: 2 }] }));
      expect(detail.possession.normal.ownedQuantity).toBe(0);
      expect(detail.possession.foil.ownedQuantity).toBe(2);
      expect(() => createCardDetail(card({ rarity, collectionEntries: [{ variant: "NORMAL", quantity: 1 }] }))).toThrow("Invalid CollectionEntry variant NORMAL");
    }
  });

  it("preserves physicalFinish precedence for migrated Normal/Foil mismatches", () => {
    const common = createCardDetail(card({ rarity: "COMMON", collectionEntries: [{ variant: "FOIL", physicalFinish: "NORMAL", quantity: 3 }, { variant: "NORMAL", physicalFinish: "FOIL", quantity: 4 }] }));
    expect(common.possession.normal.ownedQuantity).toBe(3);
    expect(common.possession.foil.ownedQuantity).toBe(4);

    expect(() => createCardDetail(card({ id: "rare-mismatch", rarity: "RARE", collectionEntries: [{ variant: "FOIL", physicalFinish: "NORMAL", quantity: 1 }] }))).toThrow("Invalid CollectionEntry variant NORMAL for card rare-mismatch; allowed variants: FOIL");

    const rare = createCardDetail(card({ rarity: "RARE", collectionEntries: [{ variant: "NORMAL", physicalFinish: "FOIL", quantity: 1 }] }));
    expect(rare.possession.foil.ownedQuantity).toBe(1);
  });

  it("keeps valid owned quantities available unless binder or assembled allocations reduce them", () => {
    const noReduction = createCardDetail(card({ collectionEntries: [{ variant: "NORMAL", quantity: 1 }, { variant: "FOIL", quantity: 1 }] }));
    expect(noReduction.possession.normal.availableQuantity).toBe(1);
    expect(noReduction.possession.foil.availableQuantity).toBe(0);

    const assembled = createCardDetail(card({ id: "assembled-card", collectionEntries: [{ variant: "NORMAL", quantity: 4 }] }), [{ assembled: true, allocations: [{ cardId: "assembled-card", variant: "NORMAL", quantity: 2 }] }]);
    expect(assembled.possession.normal).toEqual({ ownedQuantity: 4, binderReservedQuantity: 1, availableQuantity: 1 });

    const theoretical = createCardDetail(card({ id: "theoretical-card", collectionEntries: [{ variant: "NORMAL", quantity: 4 }] }), [{ assembled: false, allocations: [{ cardId: "theoretical-card", variant: "NORMAL", quantity: 2 }] }]);
    expect(theoretical.possession.normal).toEqual({ ownedQuantity: 4, binderReservedQuantity: 1, availableQuantity: 3 });
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

    expect(prismaMock.card.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
          collectionEntries: { select: { variant: true, physicalFinish: true, cardLanguage: true, quantity: true } },
        }),
      }),
    );
    expect(prismaMock.deck.findMany).toHaveBeenCalledWith({
      where: {
        status: "ASSEMBLED",
        allocations: { some: { cardId: "db-detail-card" } },
      },
      select: {
        allocations: {
          where: { cardId: "db-detail-card" },
          select: { cardId: true, variant: true, physicalFinish: true, cardLanguage: true, quantity: true },
        },
      },
    });
    expect(
      detail ? ownershipRows(detail).find((row) => row.variant === "NORMAL") : undefined,
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

  it("rejects unsupported persisted Normal snapshots for Foil-only Rare cards", () => {
    expect(() =>
      createCardDetail(
        card({
          id: "rare-detail",
          rarity: "RARE",
          collectionEntries: [{ variant: "NORMAL", quantity: 1 }],
        }),
      ),
    ).toThrow("Invalid CollectionEntry variant NORMAL for card rare-detail; allowed variants: FOIL");
  });

  it("still returns zero-valued Normal block for valid Foil-only Rare cards", () => {
    const detail = createCardDetail(
      card({
        id: "rare-detail",
        rarity: "RARE",
        collectionEntries: [{ variant: "FOIL", quantity: 2 }],
      }),
    );

    expect(detail.possession.normal).toEqual({ ownedQuantity: 0, binderReservedQuantity: 0, availableQuantity: 0 });
    expect(detail.possession.foil).toEqual({ ownedQuantity: 2, binderReservedQuantity: 1, availableQuantity: 1 });
  });

  it("marks TOKEN and RULES cards as non-trackable without ownership variants", () => {
    expect(createCardDetail(card({ kind: "TOKEN" })).possession.isTrackable).toBe(false);
    expect(createCardDetail(card({ kind: "RULES" })).possession.isTrackable).toBe(false);
  });

  it("queries exact gameplay identity related printings and excludes the current card", async () => {
    prismaMock.card.findUnique.mockResolvedValueOnce(card({ id: "current", gameplayIdentityKey: "  identity-1  " }));
    prismaMock.deck.findMany.mockResolvedValueOnce([]);
    prismaMock.card.findMany.mockResolvedValueOnce([
      card({ id: "showcase", name: "Showcase", collectorCategory: "SHOWCASE", gameplayIdentityKey: "identity-1", collectionEntries: [{ variant: "FOIL", physicalFinish: "FOIL", quantity: 2 }] }),
      card({ id: "standard", name: "Standard", collectorCategory: "STANDARD", gameplayIdentityKey: "identity-1", collectionEntries: [{ variant: "NORMAL", physicalFinish: "NORMAL", quantity: 1 }] }),
    ]);

    const detail = await getCardDetail("current");

    expect(prismaMock.card.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { gameplayIdentityKey: "  identity-1  ", id: { not: "current" } },
      orderBy: [
        { set: { releasedAt: "asc" } },
        { set: { code: "asc" } },
        { collectorNumber: "asc" },
        { id: "asc" },
      ],
    }));
    expect(detail?.relatedPrintings.map((printing) => printing.id)).toEqual(["showcase", "standard"]);
    expect(detail?.relatedPrintings.map((printing) => printing.ownedQuantity)).toEqual([2, 1]);
    expect(detail?.relatedPrintings[0]?.href).toBe("/cards/showcase");
  });

  it("does not query related printings for null, empty, or whitespace gameplay identity keys", async () => {
    prismaMock.card.findMany.mockClear();

    for (const gameplayIdentityKey of [null, "", "   "]) {
      prismaMock.card.findUnique.mockResolvedValueOnce(card({ gameplayIdentityKey }));
      prismaMock.deck.findMany.mockResolvedValueOnce([]);

      const detail = await getCardDetail(`identity-${String(gameplayIdentityKey)}`);

      expect(detail?.relatedPrintings).toEqual([]);
    }

    expect(prismaMock.card.findMany).not.toHaveBeenCalled();
  });

  it("rejects unsupported related-printing ownership with the same validation as current card", () => {
    expect(() =>
      createCardDetail(card({ id: "base", gameplayIdentityKey: "shared" }), [], [
        card({ id: "rare-related", rarity: "RARE", gameplayIdentityKey: "shared", collectionEntries: [{ variant: "NORMAL", physicalFinish: "NORMAL", quantity: 1 }] }),
      ]),
    ).toThrow("Invalid CollectionEntry variant NORMAL for card rare-related; allowed variants: FOIL");
  });

  it("keeps related-printing ownership attached to each exact printed card", () => {
    const detail = createCardDetail(
      card({ id: "base", gameplayIdentityKey: "shared" }),
      [],
      [
        card({ id: "owned-printing", gameplayIdentityKey: "shared", collectionEntries: [{ variant: "NORMAL", physicalFinish: "NORMAL", quantity: 4 }] }),
        card({ id: "unowned-printing", gameplayIdentityKey: "shared", collectionEntries: [] }),
      ],
    );

    expect(detail.relatedPrintings).toMatchObject([
      { id: "owned-printing", ownedQuantity: 4 },
      { id: "unowned-printing", ownedQuantity: 0 },
    ]);
  });

});
