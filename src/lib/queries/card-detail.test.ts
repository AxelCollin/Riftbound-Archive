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
    { variant: "NORMAL" as const, ownedQuantity: detail.possession.normal.ownedQuantity, binderReservedQuantity: detail.possession.normal.binderReservedQuantity, availableQuantity: detail.possession.normal.availableQuantity },
    { variant: "FOIL" as const, ownedQuantity: detail.possession.foil.ownedQuantity, binderReservedQuantity: detail.possession.foil.binderReservedQuantity, availableQuantity: detail.possession.foil.availableQuantity },
  ];

  return detail.possession.legacyShowcaseCompatibility
    ? [...rows.filter((row) => row.variant !== "NORMAL" || row.ownedQuantity > 0 || row.binderReservedQuantity > 0 || row.availableQuantity > 0), { variant: "SHOWCASE" as const, ownedQuantity: detail.possession.legacyShowcaseCompatibility.ownedQuantity, binderReservedQuantity: detail.possession.legacyShowcaseCompatibility.binderReservedQuantity, availableQuantity: detail.possession.legacyShowcaseCompatibility.availableQuantity }]
    : rows;
}

describe("card detail mapping", () => {
  it("tracks UNKNOWN editable quantities separately from aggregate language ownership", () => {
    const detail = createCardDetail(card({ collectionEntries: [
      { variant: "NORMAL", physicalFinish: "NORMAL", cardLanguage: "FR", quantity: 2 },
      { variant: "NORMAL", physicalFinish: "NORMAL", cardLanguage: "UNKNOWN", quantity: 1 },
      { variant: "FOIL", physicalFinish: "FOIL", cardLanguage: "EN", quantity: 3 },
      { variant: "FOIL", physicalFinish: "FOIL", cardLanguage: "UNKNOWN", quantity: 2 },
      { variant: "SHOWCASE", physicalFinish: null, cardLanguage: "UNKNOWN", quantity: 9 },
    ] }));
    expect(detail.possession.normal).toMatchObject({ ownedQuantity: 3, editableUnknownQuantity: 1, canIncrement: true, canDecrement: true });
    expect(detail.possession.foil).toMatchObject({ ownedQuantity: 5, editableUnknownQuantity: 2, canIncrement: true, canDecrement: true });
  });

  it("does not allow decrement from aggregate FR ownership when UNKNOWN is zero", () => {
    const detail = createCardDetail(card({ collectionEntries: [{ variant: "NORMAL", physicalFinish: "NORMAL", cardLanguage: "FR", quantity: 2 }] }));
    expect(detail.possession.normal).toMatchObject({ ownedQuantity: 2, editableUnknownQuantity: 0, canIncrement: true, canDecrement: false });
  });

  it("uses physicalFinish before legacy variant for editable UNKNOWN quantities", () => {
    const detail = createCardDetail(card({ collectionEntries: [{ variant: "FOIL", physicalFinish: "NORMAL", cardLanguage: "UNKNOWN", quantity: 2 }] }));
    expect(detail.possession.normal.editableUnknownQuantity).toBe(2);
    expect(detail.possession.foil.editableUnknownQuantity).toBe(0);
  });

  it("sets edit flags from trackability and supported finishes", () => {
    const rare = createCardDetail(card({ rarity: "RARE", collectionEntries: [{ variant: "FOIL", cardLanguage: "UNKNOWN", quantity: 1 }] }));
    expect(rare.possession.normal).toMatchObject({ canIncrement: false, canDecrement: false });
    expect(rare.possession.foil).toMatchObject({ canIncrement: true, canDecrement: true });
    const token = createCardDetail(card({ kind: "TOKEN", collectionEntries: [] }));
    expect(token.possession.normal.canIncrement).toBe(false);
    expect(token.possession.foil.canIncrement).toBe(false);
  });

  it("derives compact reservation status", () => {
    expect(createCardDetail(card({ collectionEntries: [] })).possession.reservationStatus).toBe("Non acquise");
    expect(createCardDetail(card({ collectionEntries: [{ variant: "NORMAL", quantity: 1 }] })).possession.reservationStatus).toBe("Réservée en Normal");
    expect(createCardDetail(card({ collectionEntries: [{ variant: "FOIL", quantity: 1 }] })).possession.reservationStatus).toBe("Réservée en Foil");
  });

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

    expect(detail.possession.normal).toMatchObject({ ownedQuantity: 0, binderReservedQuantity: 0, availableQuantity: 0 });
    expect(detail.possession.foil).toMatchObject({ ownedQuantity: 0, binderReservedQuantity: 0, availableQuantity: 0 });
    expect(detail.possession.legacyShowcaseCompatibility).toMatchObject({ ownedQuantity: 3, binderReservedQuantity: 0, availableQuantity: 3 });
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
    expect(assembled.possession.normal).toMatchObject({ ownedQuantity: 4, binderReservedQuantity: 1, availableQuantity: 1 });

    const theoretical = createCardDetail(card({ id: "theoretical-card", collectionEntries: [{ variant: "NORMAL", quantity: 4 }] }), [{ assembled: false, allocations: [{ cardId: "theoretical-card", variant: "NORMAL", quantity: 2 }] }]);
    expect(theoretical.possession.normal).toMatchObject({ ownedQuantity: 4, binderReservedQuantity: 1, availableQuantity: 3 });
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

    expect(detail.possession.normal).toMatchObject({ ownedQuantity: 0, binderReservedQuantity: 0, availableQuantity: 0 });
    expect(detail.possession.foil).toMatchObject({ ownedQuantity: 2, binderReservedQuantity: 1, availableQuantity: 1 });
  });

  it("marks TOKEN and RULES cards as non-trackable without ownership variants", () => {
    expect(createCardDetail(card({ kind: "TOKEN" })).possession.isTrackable).toBe(false);
    expect(createCardDetail(card({ kind: "RULES" })).possession.isTrackable).toBe(false);
  });

  it("retrieves bounded related-printing candidates and filters them with canonical gameplay identity keys", async () => {
    prismaMock.card.findUnique.mockResolvedValueOnce(card({
      id: "current",
      name: "Padded Current Name",
      set: { code: "CUR", name: "Current Set" },
      collectorNumber: "999",
      gameplayIdentityKey: "  identity-1  ",
    }));
    prismaMock.deck.findMany.mockResolvedValueOnce([]);
    prismaMock.card.findMany.mockResolvedValueOnce([
      card({ id: "showcase", name: "Showcase", collectorCategory: "SHOWCASE", gameplayIdentityKey: "identity-1", collectionEntries: [{ variant: "FOIL", physicalFinish: "FOIL", quantity: 2 }] }),
      card({ id: "padded", name: "Padded", collectorCategory: "STANDARD", gameplayIdentityKey: " identity-1 ", collectionEntries: [{ variant: "NORMAL", physicalFinish: "NORMAL", quantity: 1 }] }),
      card({ id: "current", name: "Current from defensive filter", gameplayIdentityKey: "identity-1" }),
      card({ id: "identity-10", name: "False Positive", gameplayIdentityKey: "identity-10" }),
      card({ id: "prefixed", name: "False Positive", gameplayIdentityKey: "xidentity-1" }),
      card({ id: "suffixed", name: "False Positive", gameplayIdentityKey: "identity-1-extra" }),
      card({ id: "spaced", name: "False Positive", gameplayIdentityKey: "identity  -1" }),
      card({ id: "case", name: "False Positive", gameplayIdentityKey: "Identity-1" }),
      card({ id: "metadata", name: "Padded Current Name", collectorNumber: "999", set: { code: "CUR", name: "Current Set" }, gameplayIdentityKey: null }),
      card({ id: "standard", name: "Standard", collectorCategory: "STANDARD", gameplayIdentityKey: "identity-1", collectionEntries: [{ variant: "NORMAL", physicalFinish: "NORMAL", quantity: 3 }] }),
    ]);

    const detail = await getCardDetail("current");

    expect(prismaMock.card.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: { not: "current" }, gameplayIdentityKey: { contains: "identity-1" } },
      orderBy: [
        { set: { releasedAt: "asc" } },
        { set: { code: "asc" } },
        { collectorNumber: "asc" },
        { id: "asc" },
      ],
    }));
    const relatedPrintingQuery = prismaMock.card.findMany.mock.calls.at(-1)?.[0];
    expect(relatedPrintingQuery?.where).toEqual({ id: { not: "current" }, gameplayIdentityKey: { contains: "identity-1" } });
    expect(relatedPrintingQuery?.where).not.toHaveProperty("name");
    expect(relatedPrintingQuery?.where).not.toHaveProperty("set");
    expect(relatedPrintingQuery?.where).not.toHaveProperty("collectorNumber");
    expect(detail?.relatedPrintings.map((printing) => printing.id)).toEqual(["showcase", "padded", "standard"]);
    expect(detail?.relatedPrintings.map((printing) => printing.ownedQuantity)).toEqual([2, 1, 3]);
    expect(detail?.relatedPrintings[0]?.href).toBe("/cards/showcase");
  });

  it.each([
    ["canonical current and canonical candidate", "identity-1", "identity-1"],
    ["padded current and canonical candidate", "  identity-1  ", "identity-1"],
    ["canonical current and padded candidate", "identity-1", "  identity-1  "],
    ["padded current and padded candidate", "  identity-1  ", " identity-1 "],
  ])("returns related printings for %s", async (_label, currentKey, candidateKey) => {
    prismaMock.card.findUnique.mockResolvedValueOnce(card({ id: "current", gameplayIdentityKey: currentKey }));
    prismaMock.deck.findMany.mockResolvedValueOnce([]);
    prismaMock.card.findMany.mockResolvedValueOnce([card({ id: "related", gameplayIdentityKey: candidateKey })]);

    const detail = await getCardDetail("current");

    expect(detail?.relatedPrintings.map((printing) => printing.id)).toEqual(["related"]);
  });

  it("keeps already canonical gameplay identity keys unchanged for related-printing lookup", async () => {
    prismaMock.card.findUnique.mockResolvedValueOnce(card({ id: "current", gameplayIdentityKey: "identity-1" }));
    prismaMock.deck.findMany.mockResolvedValueOnce([]);
    prismaMock.card.findMany.mockResolvedValueOnce([]);

    await getCardDetail("current");

    expect(prismaMock.card.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: { not: "current" }, gameplayIdentityKey: { contains: "identity-1" } },
      orderBy: [
        { set: { releasedAt: "asc" } },
        { set: { code: "asc" } },
        { collectorNumber: "asc" },
        { id: "asc" },
      ],
    }));
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
