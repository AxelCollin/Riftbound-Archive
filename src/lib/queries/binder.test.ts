import { describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  card: {
    findMany: vi.fn(),
  },
}));

vi.mock("../db", () => ({
  prisma: prismaMock,
}));

import {
  createBinderRows,
  getBinderPageData,
  summarizeBinderRows,
  type BinderCardRecord,
} from "./binder";

function card(overrides: Partial<BinderCardRecord>): BinderCardRecord {
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

describe("binder query", () => {
  it("fetches only trackable GAMEPLAY and ENERGY cards from Prisma", async () => {
    prismaMock.card.findMany.mockResolvedValueOnce([]);

    const { rows, summary } = await getBinderPageData();

    expect(prismaMock.card.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          kind: { in: ["GAMEPLAY", "ENERGY"] },
          collectorCategory: { not: "SHOWCASE" },
        },
        include: {
          set: { select: { code: true, name: true } },
          translations: { select: { locale: true, name: true } },
          collectionEntries: { select: { variant: true, physicalFinish: true, quantity: true } },
          binderOverrides: { where: { cardLanguage: "UNKNOWN" }, take: 1, select: { mode: true, variant: true, physicalFinish: true, cardLanguage: true, quantity: true } },
        },
      }),
    );
    expect(rows).toEqual([]);
    expect(summary).toEqual({ trackedRows: 0, reservedRows: 0, missingRows: 0 });
  });
});

describe("binder query mapping", () => {
  it("reserves foil for common and uncommon cards when foil and normal are owned", () => {
    const [row] = createBinderRows([
      card({
        id: "foil-first",
        collectionEntries: [
          { variant: "NORMAL", quantity: 3 },
          { variant: "FOIL", quantity: 1 },
        ],
      }),
    ]);

    expect(row).toMatchObject({
      cardId: "foil-first",
      ownedNormal: 3,
      ownedFoil: 1,
      reservedVariant: "FOIL",
      reservedQuantity: 1,
      binderStatus: "RESERVED",
    });
  });

  it("reserves normal for common and uncommon cards when only normal is owned", () => {
    const [row] = createBinderRows([
      card({
        id: "normal-only",
        rarity: "UNCOMMON",
        collectionEntries: [{ variant: "NORMAL", quantity: 2 }],
      }),
    ]);

    expect(row).toMatchObject({
      reservedVariant: "NORMAL",
      reservedQuantity: 1,
      binderStatus: "RESERVED",
    });
  });


  it("applies finish-aware BinderOverride rows when present", () => {
    const [row] = createBinderRows([
      card({
        id: "override-foil",
        collectionEntries: [
          { variant: "NORMAL", physicalFinish: "NORMAL", quantity: 3 },
          { variant: "FOIL", physicalFinish: "FOIL", quantity: 1 },
        ],
        binderOverrides: [{ mode: "FORCE_VARIANT", variant: "NORMAL", physicalFinish: "FOIL", quantity: 1 }],
      }),
    ]);

    expect(row).toMatchObject({
      reservedVariant: "FOIL",
      reservedQuantity: 1,
      binderStatus: "RESERVED",
    });
  });

  it("does not apply legacy SHOWCASE BinderOverride rows as normal or foil reservations", () => {
    const [row] = createBinderRows([
      card({
        id: "override-showcase",
        hasShowcase: true,
        collectionEntries: [
          { variant: "NORMAL", physicalFinish: "NORMAL", quantity: 3 },
          { variant: "SHOWCASE", quantity: 1 },
        ],
        binderOverrides: [{ mode: "FORCE_VARIANT", variant: "SHOWCASE", physicalFinish: null, quantity: 1 }],
      }),
    ]);

    expect(row).toMatchObject({
      reservedVariant: null,
      reservedQuantity: 0,
      binderStatus: "MISSING",
    });
  });

  it("marks a trackable card with no eligible owned variant as missing", () => {
    const [row] = createBinderRows([card({ id: "missing" })]);

    expect(row).toMatchObject({
      cardId: "missing",
      reservedVariant: null,
      reservedQuantity: 0,
      binderStatus: "MISSING",
    });
  });

  it("does not reserve showcase when showcase is the only owned variant", () => {
    const [row] = createBinderRows([
      card({
        id: "showcase-only",
        rarity: "EPIC",
        hasShowcase: true,
        collectionEntries: [{ variant: "SHOWCASE", quantity: 1 }],
      }),
    ]);

    expect(row).toMatchObject({
      ownedShowcase: 1,
      reservedVariant: null,
      reservedQuantity: 0,
      binderStatus: "MISSING",
    });
  });

  it("reserves regular foil instead of showcase when both are owned", () => {
    const [row] = createBinderRows([
      card({
        id: "foil-and-showcase",
        rarity: "RARE",
        hasShowcase: true,
        collectionEntries: [
          { variant: "FOIL", quantity: 1 },
          { variant: "SHOWCASE", quantity: 1 },
        ],
      }),
    ]);

    expect(row).toMatchObject({
      ownedFoil: 1,
      ownedShowcase: 1,
      reservedVariant: "FOIL",
      binderStatus: "RESERVED",
    });
  });


  it("excludes showcase printed cards from binder target rows", () => {
    const rows = createBinderRows([
      card({
        id: "standard-printing",
        collectionEntries: [{ variant: "NORMAL", quantity: 1 }],
      }),
      card({
        id: "showcase-printing",
        collectorCategory: "SHOWCASE",
        collectionEntries: [
          { variant: "NORMAL", quantity: 2 },
          { variant: "FOIL", quantity: 1 },
        ],
      }),
    ]);

    expect(rows.map((row) => row.cardId)).toEqual(["standard-printing"]);
  });

  it("includes ENERGY cards and reserves them according to allowed variant rules", () => {
    const [row] = createBinderRows([
      card({
        id: "energy",
        kind: "ENERGY",
        rarity: "UNKNOWN",
        collectionEntries: [{ variant: "FOIL", quantity: 2 }],
      }),
    ]);

    expect(row).toMatchObject({
      cardId: "energy",
      allowedVariants: ["FOIL"],
      reservedVariant: "FOIL",
      binderStatus: "RESERVED",
    });
  });

  it("excludes TOKEN and RULES cards", () => {
    const rows = createBinderRows([
      card({ id: "gameplay", kind: "GAMEPLAY" }),
      card({ id: "energy", kind: "ENERGY", rarity: "UNKNOWN" }),
      card({ id: "token", kind: "TOKEN" }),
      card({ id: "rules", kind: "RULES" }),
    ]);

    expect(rows.map((row) => row.cardId)).toEqual(["gameplay", "energy"]);
  });

  it("surfaces negative CollectionEntry snapshots as invalid data", () => {
    expect(() =>
      createBinderRows([
        card({
          id: "bad-card",
          collectionEntries: [{ variant: "FOIL", quantity: -1 }],
        }),
      ]),
    ).toThrow(
      "Invalid negative CollectionEntry quantity for card bad-card variant FOIL",
    );
  });

  it("surfaces invalid persisted CollectionEntry variants", () => {
    expect(() =>
      createBinderRows([
        card({
          id: "bad-rare",
          rarity: "RARE",
          collectionEntries: [{ variant: "NORMAL", quantity: 1 }],
        }),
      ]),
    ).toThrow("Invalid CollectionEntry variant NORMAL for card bad-rare");
  });

  it("summarizes only standard trackable binder targets as missing", () => {
    const rows = createBinderRows([
      card({ id: "reserved", collectionEntries: [{ variant: "NORMAL", quantity: 1 }] }),
      card({ id: "missing", rarity: "RARE" }),
      card({ id: "showcase", collectorCategory: "SHOWCASE" }),
      card({ id: "ignored", kind: "TOKEN" }),
    ]);

    expect(summarizeBinderRows(rows)).toEqual({
      trackedRows: 2,
      reservedRows: 1,
      missingRows: 1,
    });
  });

  it("keeps display name fallback deterministic", () => {
    const [row] = createBinderRows([
      card({
        name: "Base Name",
        translations: [
          { locale: "en-US", name: "English Name" },
          { locale: "fr", name: "Nom français" },
          { locale: "fr-FR", name: "Nom France" },
        ],
      }),
    ]);

    expect(row.displayName).toBe("Nom France");
  });
});
