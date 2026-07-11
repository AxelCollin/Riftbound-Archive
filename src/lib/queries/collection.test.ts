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
    officialImageUrl: null,
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
        select: expect.objectContaining({
          officialImageUrl: true,
          collectionEntries: { select: { variant: true, physicalFinish: true, cardLanguage: true, quantity: true } },
        }),
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
      card({ id: "deck-card", collectionEntries: [{ variant: "NORMAL", quantity: 3 }] }),
    ]);
    prismaMock.deck.findMany.mockResolvedValueOnce([
      { allocations: [{ cardId: "deck-card", variant: "NORMAL", quantity: 2 }] },
    ]);

    const { rows } = await getCollectionPageData();

    expect(rows[0]).toMatchObject({
      normalOwnedQuantity: 3,
      normalBinderReservedQuantity: 1,
      normalAvailableQuantity: 0,
      totalOwnedQuantity: 3,
      totalAvailableQuantity: 0,
    });
  });
});

describe("collection query mapping", () => {
  it("includes one grouped row per trackable printed card and excludes TOKEN/RULES cards", () => {
    const rows = createCollectionRows([
      card({ id: "gameplay", kind: "GAMEPLAY" }),
      card({ id: "energy", kind: "ENERGY", rarity: "UNKNOWN" }),
      card({ id: "token", kind: "TOKEN" }),
      card({ id: "rules", kind: "RULES" }),
    ]);

    expect(rows.map((row) => row.cardId)).toEqual(["gameplay", "energy"]);
  });

  it("passes official image URLs into grouped collection display rows", () => {
    const rows = createCollectionRows([
      card({ id: "image-card", officialImageUrl: "https://assets.example/riftbound/image-card.webp" }),
    ]);

    expect(rows).toMatchObject([
      { cardId: "image-card", rowId: "image-card", officialImageUrl: "https://assets.example/riftbound/image-card.webp" },
    ]);
  });

  it("groups Normal and Foil quantities on the same standard printed-card row", () => {
    const rows = createCollectionRows([
      card({
        id: "grouped-card",
        collectionEntries: [
          { variant: "NORMAL", physicalFinish: "NORMAL", quantity: 2 },
          { variant: "FOIL", physicalFinish: "FOIL", quantity: 1 },
        ],
      }),
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      cardId: "grouped-card",
      normalOwnedQuantity: 2,
      normalBinderReservedQuantity: 0,
      normalAvailableQuantity: 2,
      foilOwnedQuantity: 1,
      foilBinderReservedQuantity: 1,
      foilAvailableQuantity: 0,
      totalOwnedQuantity: 3,
      totalBinderReservedQuantity: 1,
      totalAvailableQuantity: 2,
    });
  });

  it("aggregates FR/EN/ZH ownership rows into the grouped Normal quantity", () => {
    const rows = createCollectionRows([
      card({
        id: "languages",
        collectionEntries: [
          { variant: "NORMAL", physicalFinish: "NORMAL", cardLanguage: "FR", quantity: 1 },
          { variant: "NORMAL", physicalFinish: "NORMAL", cardLanguage: "EN", quantity: 2 },
          { variant: "NORMAL", physicalFinish: "NORMAL", cardLanguage: "ZH", quantity: 3 },
        ],
      }),
    ]);

    expect(rows[0]).toMatchObject({ normalOwnedQuantity: 6, normalAvailableQuantity: 5, totalOwnedQuantity: 6 });
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

    expect(rows[0]).toMatchObject({ normalOwnedQuantity: 2, foilOwnedQuantity: 1, totalOwnedQuantity: 3 });
  });

  it("ignores legacy showcase compatibility rows for standard Normal/Foil totals", () => {
    const rows = createCollectionRows([
      card({
        id: "legacy-showcase-row",
        hasShowcase: false,
        collectionEntries: [{ variant: "SHOWCASE", physicalFinish: null, quantity: 5 }],
      }),
    ]);

    expect(rows[0]).toMatchObject({
      normalOwnedQuantity: 0,
      foilOwnedQuantity: 0,
      totalOwnedQuantity: 0,
      totalAvailableQuantity: 0,
    });
  });

  it("keeps Showcase printed cards as separate printed-card rows from standard cards", () => {
    const rows = createCollectionRows([
      card({ id: "standard", collectorCategory: "STANDARD", collectionEntries: [{ variant: "FOIL", quantity: 2 }] }),
      card({ id: "showcase-print", collectorCategory: "SHOWCASE", printTreatment: "ALT", collectionEntries: [{ variant: "FOIL", quantity: 1 }] }),
    ]);

    expect(rows.map((row) => row.cardId)).toEqual(["standard", "showcase-print"]);
    expect(rows[1]).toMatchObject({ collectorCategory: "SHOWCASE", printTreatment: "ALT", foilOwnedQuantity: 1 });
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

    expect(rows[0]).toMatchObject({
      normalOwnedQuantity: 3,
      normalBinderReservedQuantity: 0,
      normalAvailableQuantity: 3,
      foilOwnedQuantity: 1,
      foilBinderReservedQuantity: 1,
      foilAvailableQuantity: 0,
      totalOwnedQuantity: 4,
      totalBinderReservedQuantity: 1,
      totalAvailableQuantity: 3,
    });
  });

  it("reserves normal for common and uncommon cards when only normal is owned", () => {
    const rows = createCollectionRows([
      card({ id: "common-normal", rarity: "UNCOMMON", collectionEntries: [{ variant: "NORMAL", quantity: 2 }] }),
    ]);

    expect(rows[0]).toMatchObject({
      normalOwnedQuantity: 2,
      normalBinderReservedQuantity: 1,
      normalAvailableQuantity: 1,
      foilOwnedQuantity: 0,
      totalOwnedQuantity: 2,
      totalAvailableQuantity: 1,
    });
  });

  it("reserves foil for rare, epic, ultimate, and ENERGY foil-only cards", () => {
    const rows = createCollectionRows([
      card({ id: "rare-foil", rarity: "RARE", collectionEntries: [{ variant: "FOIL", quantity: 2 }] }),
      card({ id: "epic-foil", rarity: "EPIC", collectionEntries: [{ variant: "FOIL", quantity: 1 }] }),
      card({ id: "ultimate-foil", rarity: "ULTIMATE", collectionEntries: [{ variant: "FOIL", quantity: 3 }] }),
      card({ id: "energy-card", kind: "ENERGY", rarity: "UNKNOWN", collectionEntries: [{ variant: "FOIL", quantity: 2 }] }),
    ]);

    expect(rows.map(({ cardId, foilOwnedQuantity, foilBinderReservedQuantity, foilAvailableQuantity, totalOwnedQuantity, totalAvailableQuantity }) => ({
      cardId,
      foilOwnedQuantity,
      foilBinderReservedQuantity,
      foilAvailableQuantity,
      totalOwnedQuantity,
      totalAvailableQuantity,
    }))).toEqual([
      { cardId: "rare-foil", foilOwnedQuantity: 2, foilBinderReservedQuantity: 1, foilAvailableQuantity: 1, totalOwnedQuantity: 2, totalAvailableQuantity: 1 },
      { cardId: "epic-foil", foilOwnedQuantity: 1, foilBinderReservedQuantity: 1, foilAvailableQuantity: 0, totalOwnedQuantity: 1, totalAvailableQuantity: 0 },
      { cardId: "ultimate-foil", foilOwnedQuantity: 3, foilBinderReservedQuantity: 1, foilAvailableQuantity: 2, totalOwnedQuantity: 3, totalAvailableQuantity: 2 },
      { cardId: "energy-card", foilOwnedQuantity: 2, foilBinderReservedQuantity: 1, foilAvailableQuantity: 1, totalOwnedQuantity: 2, totalAvailableQuantity: 1 },
    ]);
  });

  it("subtracts assembled deck allocations from available quantity", () => {
    const rows = createCollectionRows(
      [card({ id: "assembled-card", collectionEntries: [{ variant: "NORMAL", quantity: 4 }] })],
      [{ assembled: true, allocations: [{ cardId: "assembled-card", variant: "NORMAL", quantity: 2 }] }],
    );

    expect(rows[0]).toMatchObject({ normalOwnedQuantity: 4, normalBinderReservedQuantity: 1, normalAvailableQuantity: 1 });
  });

  it("does not subtract theoretical deck allocations from available quantity", () => {
    const rows = createCollectionRows(
      [card({ id: "theory-card", collectionEntries: [{ variant: "NORMAL", quantity: 4 }] })],
      [{ assembled: false, allocations: [{ cardId: "theory-card", variant: "NORMAL", quantity: 2 }] }],
    );

    expect(rows[0]).toMatchObject({ normalOwnedQuantity: 4, normalBinderReservedQuantity: 1, normalAvailableQuantity: 3 });
  });

  it("clamps availability to 0 when binder reservation plus assembled allocation exceeds owned", () => {
    const rows = createCollectionRows(
      [card({ id: "clamped-card", collectionEntries: [{ variant: "NORMAL", quantity: 1 }] })],
      [{ assembled: true, allocations: [{ cardId: "clamped-card", variant: "NORMAL", quantity: 2 }] }],
    );

    expect(rows[0]).toMatchObject({ normalOwnedQuantity: 1, normalBinderReservedQuantity: 1, normalAvailableQuantity: 0 });
  });

  it("surfaces negative CollectionEntry snapshots as invalid data", () => {
    expect(() =>
      createCollectionRows([
        card({ id: "bad-card", collectionEntries: [{ variant: "FOIL", quantity: -1 }] }),
      ]),
    ).toThrow("Invalid negative CollectionEntry quantity for card bad-card variant FOIL");
  });

  it("surfaces NORMAL snapshots on foil-only cards as invalid persisted data", () => {
    expect(() =>
      createCollectionRows([
        card({ id: "bad-rare", rarity: "RARE", collectionEntries: [{ variant: "NORMAL", quantity: 1 }] }),
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

    expect(getDisplayCardName(card({ translations: [{ locale: "de", name: "Deutsch" }] }))).toBe("Base Name");
  });

  it("summarizes owned, trackable, and missing grouped rows", () => {
    const rows = createCollectionRows([
      card({ id: "first", collectionEntries: [{ variant: "NORMAL", quantity: 2 }] }),
      card({ id: "second", rarity: "RARE" }),
    ]);

    expect(summarizeCollectionRows(rows)).toEqual({
      totalOwnedCopies: 2,
      ownedRows: 1,
      trackableRows: 2,
      missingRows: 1,
    });
  });
});
