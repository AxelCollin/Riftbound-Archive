import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  boosterSettings: {
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  boosterCounterEvent: {
    aggregate: vi.fn(),
    create: vi.fn(),
  },
  boosterOpening: {
    create: vi.fn(),
    findMany: vi.fn(),
  },
  boosterOpeningCard: { create: vi.fn() },
  card: { findMany: vi.fn(), findUnique: vi.fn() },
  collectionEntry: { create: vi.fn(), update: vi.fn(), upsert: vi.fn() },
  collectionTransaction: { create: vi.fn() },
  $transaction: vi.fn(async (callback) => callback(prismaMock)),
}));

vi.mock("@/lib/db", () => ({ prisma: prismaMock }));

import { getBoosterOverview, getBoosterSettings, recordBoosterOpening, updateBoosterSettings } from "./boosters";

const record = {
  id: "settings-1",
  boostersPerInterval: 2,
  intervalCount: 1,
  intervalUnit: "DAY" as const,
  accrualAnchorAt: new Date("2026-07-01T00:00:00.000Z"),
  autoDecrementOnOpening: false,
  createdAt: new Date("2026-07-01T00:00:00.000Z"),
  updatedAt: new Date("2026-07-02T00:00:00.000Z"),
};

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.boosterCounterEvent.aggregate.mockResolvedValue({ _sum: { quantityDelta: 0 } });
  prismaMock.boosterOpening.findMany.mockResolvedValue([]);
  prismaMock.card.findMany.mockResolvedValue([]);
  prismaMock.$transaction.mockImplementation(async (callback) => callback(prismaMock));
});

describe("booster settings service", () => {
  it("returns persisted settings with calculated counter state", async () => {
    prismaMock.boosterSettings.findFirst.mockResolvedValueOnce(record);

    await expect(getBoosterOverview(new Date("2026-07-04T00:00:00.000Z"))).resolves.toMatchObject({
      id: "settings-1",
      boostersPerInterval: 2,
      counter: {
        accumulatedBoosters: 6,
        completeIntervals: 3,
        accrualAnchorAt: "2026-07-01T00:00:00.000Z",
        calculatedAt: "2026-07-04T00:00:00.000Z",
      },
    });
  });

  it("includes materialized counter events plus virtual accrual in the overview", async () => {
    prismaMock.boosterSettings.findFirst.mockResolvedValueOnce({ ...record, boostersPerInterval: 1 });
    prismaMock.boosterCounterEvent.aggregate.mockResolvedValueOnce({ _sum: { quantityDelta: 4 } });

    await expect(getBoosterOverview(new Date("2026-07-04T00:00:00.000Z"))).resolves.toMatchObject({
      counter: {
        accumulatedBoosters: 7,
        completeIntervals: 3,
      },
    });
  });

  it("returns default settings and a safe zero counter when no row exists", async () => {
    prismaMock.boosterSettings.findFirst.mockResolvedValueOnce(null);

    await expect(getBoosterOverview(new Date("2026-07-04T00:00:00.000Z"))).resolves.toMatchObject({
      id: null,
      boostersPerInterval: 1,
      counter: {
        accumulatedBoosters: 0,
        completeIntervals: 0,
        accrualAnchorAt: "2026-07-04T00:00:00.000Z",
        calculatedAt: "2026-07-04T00:00:00.000Z",
      },
    });
  });

  it("returns default settings when no persisted row exists", async () => {
    prismaMock.boosterSettings.findFirst.mockResolvedValueOnce(null);

    await expect(getBoosterSettings()).resolves.toMatchObject({
      id: null,
      boostersPerInterval: 1,
      intervalCount: 1,
      intervalUnit: "DAY",
      autoDecrementOnOpening: true,
    });
  });

  it("updates the existing settings row", async () => {
    prismaMock.boosterSettings.findFirst.mockResolvedValueOnce({ ...record, accrualAnchorAt: new Date("2026-07-04T00:00:00.000Z") });
    prismaMock.boosterSettings.update.mockResolvedValueOnce(record);

    const result = await updateBoosterSettings({ boostersPerInterval: 2, intervalCount: 1, intervalUnit: "DAY", autoDecrementOnOpening: false });

    expect(prismaMock.boosterSettings.update).toHaveBeenCalledWith({
      where: { id: "settings-1" },
      data: { boostersPerInterval: 2, intervalCount: 1, intervalUnit: "DAY", autoDecrementOnOpening: false },
    });
    expect(result.boostersPerInterval).toBe(2);
  });

  it("preserves already-earned boosters when increasing the daily gain", async () => {
    const july4 = new Date("2026-07-04T00:00:00.000Z");
    const updated = { ...record, boostersPerInterval: 2, accrualAnchorAt: july4, updatedAt: july4 };
    prismaMock.boosterSettings.findFirst.mockResolvedValueOnce({ ...record, boostersPerInterval: 1 });
    prismaMock.boosterSettings.update.mockResolvedValueOnce(updated);

    const result = await updateBoosterSettings({ boostersPerInterval: 2, intervalCount: 1, intervalUnit: "DAY", autoDecrementOnOpening: false }, july4);

    expect(prismaMock.boosterCounterEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ type: "ACCRUAL", quantityDelta: 3, occurredAt: july4 }),
    });
    expect(prismaMock.boosterSettings.update).toHaveBeenCalledWith({
      where: { id: "settings-1" },
      data: expect.objectContaining({ boostersPerInterval: 2, accrualAnchorAt: july4 }),
    });
    expect(result.accrualAnchorAt).toBe("2026-07-04T00:00:00.000Z");

    prismaMock.boosterSettings.findFirst.mockResolvedValueOnce(updated);
    prismaMock.boosterCounterEvent.aggregate.mockResolvedValueOnce({ _sum: { quantityDelta: 3 } });
    await expect(getBoosterOverview(july4)).resolves.toMatchObject({ counter: { accumulatedBoosters: 3 } });

    prismaMock.boosterSettings.findFirst.mockResolvedValueOnce(updated);
    prismaMock.boosterCounterEvent.aggregate.mockResolvedValueOnce({ _sum: { quantityDelta: 3 } });
    await expect(getBoosterOverview(new Date("2026-07-05T00:00:00.000Z"))).resolves.toMatchObject({ counter: { accumulatedBoosters: 5 } });
  });

  it("preserves already-earned boosters and stops future accrual when the daily gain changes to zero", async () => {
    const july4 = new Date("2026-07-04T00:00:00.000Z");
    const updated = { ...record, boostersPerInterval: 0, accrualAnchorAt: july4, updatedAt: july4 };
    prismaMock.boosterSettings.findFirst.mockResolvedValueOnce({ ...record, boostersPerInterval: 1 });
    prismaMock.boosterSettings.update.mockResolvedValueOnce(updated);

    await updateBoosterSettings({ boostersPerInterval: 0, intervalCount: 1, intervalUnit: "DAY", autoDecrementOnOpening: false }, july4);

    expect(prismaMock.boosterCounterEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ type: "ACCRUAL", quantityDelta: 3, occurredAt: july4 }),
    });

    prismaMock.boosterSettings.findFirst.mockResolvedValueOnce(updated);
    prismaMock.boosterCounterEvent.aggregate.mockResolvedValueOnce({ _sum: { quantityDelta: 3 } });
    await expect(getBoosterOverview(new Date("2026-07-05T00:00:00.000Z"))).resolves.toMatchObject({ counter: { accumulatedBoosters: 3 } });
  });

  it("creates settings with defaults-compatible fields when none exist", async () => {
    prismaMock.boosterSettings.findFirst.mockResolvedValueOnce(null);
    prismaMock.boosterSettings.create.mockResolvedValueOnce(record);

    await updateBoosterSettings({ boostersPerInterval: 2, intervalCount: 1, intervalUnit: "DAY", autoDecrementOnOpening: "false" });

    expect(prismaMock.boosterSettings.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ boostersPerInterval: 2, intervalCount: 1, intervalUnit: "DAY", autoDecrementOnOpening: false, accrualAnchorAt: expect.any(Date) }),
    });
  });
});

describe("booster opening service", () => {
  const openedAt = new Date("2026-07-04T12:00:00.000Z");
  const opening = {
    id: "opening-1",
    openedAt,
    boosterCount: 1,
    decrementCounter: true,
    note: "Soirée draft",
  };

  it("records one booster opening", async () => {
    prismaMock.boosterSettings.findFirst.mockResolvedValueOnce({ ...record, accrualAnchorAt: openedAt });
    prismaMock.boosterOpening.create.mockResolvedValueOnce(opening);

    await expect(recordBoosterOpening({ boosterCount: 1, decrementCounter: true, note: " Soirée draft " }, openedAt)).resolves.toMatchObject({
      id: "opening-1",
      boosterCount: 1,
      note: "Soirée draft",
    });

    expect(prismaMock.boosterOpening.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ boosterCount: 1, decrementCounter: true, note: "Soirée draft", openedAt }),
    });
  });

  it("creates a negative opening decrement counter event when requested", async () => {
    prismaMock.boosterSettings.findFirst.mockResolvedValueOnce({ ...record, accrualAnchorAt: openedAt });
    prismaMock.boosterOpening.create.mockResolvedValueOnce(opening);

    await recordBoosterOpening({ boosterCount: 2, decrementCounter: true, note: "" }, openedAt);

    expect(prismaMock.boosterCounterEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ type: "OPENING_DECREMENT", quantityDelta: -2, occurredAt: openedAt, boosterOpeningId: "opening-1" }),
    });
  });

  it("creates no decrement event when decrementCounter is false", async () => {
    prismaMock.boosterSettings.findFirst.mockResolvedValueOnce({ ...record, accrualAnchorAt: openedAt });
    prismaMock.boosterOpening.create.mockResolvedValueOnce({ ...opening, decrementCounter: false });

    await recordBoosterOpening({ boosterCount: 2, decrementCounter: false, note: "" }, openedAt);

    expect(prismaMock.boosterCounterEvent.create).not.toHaveBeenCalledWith({
      data: expect.objectContaining({ type: "OPENING_DECREMENT" }),
    });
  });

  it("does not block insufficient counters and can produce a negative ledger", async () => {
    prismaMock.boosterSettings.findFirst.mockResolvedValueOnce({ ...record, accrualAnchorAt: openedAt });
    prismaMock.boosterOpening.create.mockResolvedValueOnce({ ...opening, boosterCount: 5 });

    await recordBoosterOpening({ boosterCount: 5, decrementCounter: true, note: "" }, openedAt);

    expect(prismaMock.boosterCounterEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ type: "OPENING_DECREMENT", quantityDelta: -5 }),
    });
  });

  it("materializes pending virtual accrual before opening decrement", async () => {
    prismaMock.boosterSettings.findFirst.mockResolvedValueOnce({ ...record, boostersPerInterval: 1, accrualAnchorAt: new Date("2026-07-01T00:00:00.000Z") });
    prismaMock.boosterOpening.create.mockResolvedValueOnce(opening);

    await recordBoosterOpening({ boosterCount: 1, decrementCounter: true, note: "" }, new Date("2026-07-04T00:00:00.000Z"));

    expect(prismaMock.boosterCounterEvent.create).toHaveBeenNthCalledWith(1, {
      data: expect.objectContaining({ type: "ACCRUAL", quantityDelta: 3 }),
    });
    expect(prismaMock.boosterSettings.update).toHaveBeenCalledWith({
      where: { id: "settings-1" },
      data: { accrualAnchorAt: new Date("2026-07-04T00:00:00.000Z") },
    });
    expect(prismaMock.boosterCounterEvent.create).toHaveBeenNthCalledWith(2, {
      data: expect.objectContaining({ type: "OPENING_DECREMENT", quantityDelta: -1 }),
    });
  });

  it("preserves partial accrual progress when materializing before an opening", async () => {
    const openingAtNoon = new Date("2026-07-04T12:00:00.000Z");
    prismaMock.boosterSettings.findFirst.mockResolvedValueOnce({ ...record, boostersPerInterval: 1, accrualAnchorAt: new Date("2026-07-01T00:00:00.000Z") });
    prismaMock.boosterOpening.create.mockResolvedValueOnce({ ...opening, openedAt: openingAtNoon });

    await recordBoosterOpening({ boosterCount: 1, decrementCounter: true, note: "" }, openingAtNoon);

    expect(prismaMock.boosterCounterEvent.create).toHaveBeenNthCalledWith(1, {
      data: expect.objectContaining({ type: "ACCRUAL", quantityDelta: 3, occurredAt: openingAtNoon }),
    });
    expect(prismaMock.boosterSettings.update).toHaveBeenCalledWith({
      where: { id: "settings-1" },
      data: { accrualAnchorAt: new Date("2026-07-04T00:00:00.000Z") },
    });
  });

  it("shows the next daily booster accrued after a partial-progress opening", async () => {
    prismaMock.boosterSettings.findFirst.mockResolvedValueOnce({ ...record, boostersPerInterval: 1, accrualAnchorAt: new Date("2026-07-04T00:00:00.000Z") });
    prismaMock.boosterCounterEvent.aggregate.mockResolvedValueOnce({ _sum: { quantityDelta: 2 } });

    await expect(getBoosterOverview(new Date("2026-07-05T00:00:00.000Z"))).resolves.toMatchObject({
      counter: {
        accumulatedBoosters: 3,
        completeIntervals: 1,
        accrualAnchorAt: "2026-07-04T00:00:00.000Z",
      },
    });
  });

  it("does not materialize accrual or update the anchor before one complete interval", async () => {
    const beforeBoundary = new Date("2026-07-01T12:00:00.000Z");
    prismaMock.boosterSettings.findFirst.mockResolvedValueOnce({ ...record, boostersPerInterval: 1, accrualAnchorAt: new Date("2026-07-01T00:00:00.000Z") });
    prismaMock.boosterOpening.create.mockResolvedValueOnce({ ...opening, openedAt: beforeBoundary });

    await recordBoosterOpening({ boosterCount: 1, decrementCounter: true, note: "" }, beforeBoundary);

    expect(prismaMock.boosterCounterEvent.create).not.toHaveBeenCalledWith({
      data: expect.objectContaining({ type: "ACCRUAL" }),
    });
    expect(prismaMock.boosterSettings.update).not.toHaveBeenCalled();
    expect(prismaMock.boosterCounterEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ type: "OPENING_DECREMENT", quantityDelta: -1 }),
    });
  });

  it("creates default settings when recording the first opening on a fresh database", async () => {
    prismaMock.boosterSettings.findFirst.mockResolvedValueOnce(null);
    prismaMock.boosterSettings.create.mockResolvedValueOnce({
      ...record,
      boostersPerInterval: 1,
      intervalCount: 1,
      intervalUnit: "DAY",
      autoDecrementOnOpening: true,
      accrualAnchorAt: openedAt,
    });
    prismaMock.boosterOpening.create.mockResolvedValueOnce(opening);

    await recordBoosterOpening({ boosterCount: 1, decrementCounter: false, note: "" }, openedAt);

    expect(prismaMock.boosterSettings.create).toHaveBeenCalledWith({
      data: {
        boostersPerInterval: 1,
        intervalCount: 1,
        intervalUnit: "DAY",
        autoDecrementOnOpening: true,
        accrualAnchorAt: openedAt,
      },
    });
    expect(prismaMock.boosterOpening.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ openedAt, boosterCount: 1, decrementCounter: false }),
    });
  });

  it("atomically creates default settings, opening, and decrement event on a fresh database", async () => {
    prismaMock.boosterSettings.findFirst.mockResolvedValueOnce(null);
    prismaMock.boosterSettings.create.mockResolvedValueOnce({
      ...record,
      boostersPerInterval: 1,
      intervalCount: 1,
      intervalUnit: "DAY",
      autoDecrementOnOpening: true,
      accrualAnchorAt: openedAt,
    });
    prismaMock.boosterOpening.create.mockResolvedValueOnce(opening);

    await recordBoosterOpening({ boosterCount: 2, decrementCounter: true, note: "" }, openedAt);

    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(prismaMock.boosterSettings.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ boostersPerInterval: 1, intervalCount: 1, intervalUnit: "DAY", autoDecrementOnOpening: true, accrualAnchorAt: openedAt }),
    });
    expect(prismaMock.boosterOpening.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ openedAt, boosterCount: 2, decrementCounter: true }),
    });
    expect(prismaMock.boosterCounterEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ type: "OPENING_DECREMENT", quantityDelta: -2, occurredAt: openedAt, boosterOpeningId: "opening-1" }),
    });
    expect(prismaMock.collectionEntry.upsert).not.toHaveBeenCalled();
    expect(prismaMock.collectionTransaction.create).not.toHaveBeenCalled();
  });

  it("accrues future overview counters from the persisted first-opening anchor", async () => {
    prismaMock.boosterSettings.findFirst.mockResolvedValueOnce({
      ...record,
      boostersPerInterval: 1,
      intervalCount: 1,
      intervalUnit: "DAY",
      autoDecrementOnOpening: true,
      accrualAnchorAt: openedAt,
    });
    prismaMock.boosterCounterEvent.aggregate.mockResolvedValueOnce({ _sum: { quantityDelta: -1 } });

    await expect(getBoosterOverview(new Date("2026-07-05T12:00:00.000Z"))).resolves.toMatchObject({
      id: "settings-1",
      counter: {
        accumulatedBoosters: 0,
        completeIntervals: 1,
        accrualAnchorAt: "2026-07-04T12:00:00.000Z",
      },
    });
  });

  it("uses a transaction for the atomic opening write", async () => {
    prismaMock.boosterSettings.findFirst.mockResolvedValueOnce({ ...record, accrualAnchorAt: openedAt });
    prismaMock.boosterOpening.create.mockResolvedValueOnce(opening);

    await recordBoosterOpening({ boosterCount: 1, decrementCounter: true, note: "" }, openedAt);

    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(prismaMock.collectionEntry.upsert).not.toHaveBeenCalled();
    expect(prismaMock.collectionTransaction.create).not.toHaveBeenCalled();
  });


  it("records pulled cards and adds them to the collection", async () => {
    prismaMock.boosterSettings.findFirst.mockResolvedValueOnce({ ...record, accrualAnchorAt: openedAt });
    prismaMock.card.findUnique.mockResolvedValueOnce({ id: "card-1", name: "Ahri", rarity: "COMMON", kind: "GAMEPLAY", hasShowcase: false });
    prismaMock.boosterOpening.create.mockResolvedValueOnce(opening);

    await recordBoosterOpening({ boosterCount: 1, decrementCounter: false, note: "", pulls: [{ cardId: "card-1", variant: "NORMAL", quantity: 2 }] }, openedAt);

    expect(prismaMock.boosterOpeningCard.create).toHaveBeenCalledWith({
      data: { boosterOpeningId: "opening-1", cardId: "card-1", variant: "NORMAL", quantity: 2 },
    });
    expect(prismaMock.collectionTransaction.create).toHaveBeenCalledWith({
      data: { cardId: "card-1", variant: "NORMAL", type: "ADD", quantity: 2, source: "booster-opening:opening-1", note: "Ouverture de booster" },
    });
    expect(prismaMock.collectionEntry.upsert).toHaveBeenCalledWith({
      where: { cardId_variant: { cardId: "card-1", variant: "NORMAL" } },
      create: { cardId: "card-1", variant: "NORMAL", quantity: 2 },
      update: { quantity: { increment: 2 } },
    });
  });

  it("merges duplicate pulled card and variant rows deterministically", async () => {
    prismaMock.boosterSettings.findFirst.mockResolvedValueOnce({ ...record, accrualAnchorAt: openedAt });
    prismaMock.card.findUnique.mockResolvedValueOnce({ id: "card-1", name: "Ahri", rarity: "COMMON", kind: "GAMEPLAY", hasShowcase: false });
    prismaMock.boosterOpening.create.mockResolvedValueOnce(opening);

    await recordBoosterOpening({ boosterCount: 1, decrementCounter: false, note: "", pulls: [
      { cardId: "card-1", variant: "NORMAL", quantity: 1 },
      { cardId: "card-1", variant: "NORMAL", quantity: 3 },
    ] }, openedAt);

    expect(prismaMock.boosterOpeningCard.create).toHaveBeenCalledTimes(1);
    expect(prismaMock.boosterOpeningCard.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ cardId: "card-1", variant: "NORMAL", quantity: 4 }),
    });
  });

  it("handles multiple pulled card rows", async () => {
    prismaMock.boosterSettings.findFirst.mockResolvedValueOnce({ ...record, accrualAnchorAt: openedAt });
    prismaMock.card.findUnique
      .mockResolvedValueOnce({ id: "card-1", name: "Ahri", rarity: "COMMON", kind: "GAMEPLAY", hasShowcase: false })
      .mockResolvedValueOnce({ id: "card-2", name: "Rune", rarity: "RARE", kind: "ENERGY", hasShowcase: true });
    prismaMock.boosterOpening.create.mockResolvedValueOnce(opening);

    await recordBoosterOpening({ boosterCount: 2, decrementCounter: false, note: "", pulls: [
      { cardId: "card-1", variant: "FOIL", quantity: 1 },
      { cardId: "card-2", variant: "SHOWCASE", quantity: 1 },
    ] }, openedAt);

    expect(prismaMock.boosterOpeningCard.create).toHaveBeenCalledTimes(2);
    expect(prismaMock.collectionTransaction.create).toHaveBeenCalledTimes(2);
    expect(prismaMock.collectionEntry.upsert).toHaveBeenCalledTimes(2);
  });

  it("rejects TOKEN and RULES pulled cards without partial writes", async () => {
    prismaMock.boosterSettings.findFirst.mockResolvedValueOnce({ ...record, accrualAnchorAt: openedAt });
    prismaMock.card.findUnique.mockResolvedValueOnce({ id: "token", name: "Token", rarity: "COMMON", kind: "TOKEN", hasShowcase: false });

    await expect(recordBoosterOpening({ boosterCount: 1, decrementCounter: false, note: "", pulls: [{ cardId: "token", variant: "NORMAL", quantity: 1 }] }, openedAt)).rejects.toThrow("Seules les cartes GAMEPLAY et ENERGY");

    expect(prismaMock.boosterOpening.create).not.toHaveBeenCalled();
    expect(prismaMock.collectionTransaction.create).not.toHaveBeenCalled();
  });

  it("rejects invalid pulled card ids", async () => {
    prismaMock.boosterSettings.findFirst.mockResolvedValueOnce({ ...record, accrualAnchorAt: openedAt });
    prismaMock.card.findUnique.mockResolvedValueOnce(null);

    await expect(recordBoosterOpening({ boosterCount: 1, decrementCounter: false, note: "", pulls: [{ cardId: "missing", variant: "NORMAL", quantity: 1 }] }, openedAt)).rejects.toThrow("Carte ouverte introuvable.");
    expect(prismaMock.boosterOpening.create).not.toHaveBeenCalled();
  });

  it("rejects unsupported pulled variants", async () => {
    prismaMock.boosterSettings.findFirst.mockResolvedValueOnce({ ...record, accrualAnchorAt: openedAt });
    prismaMock.card.findUnique.mockResolvedValueOnce({ id: "card-1", name: "Ahri", rarity: "COMMON", kind: "GAMEPLAY", hasShowcase: false });

    await expect(recordBoosterOpening({ boosterCount: 1, decrementCounter: false, note: "", pulls: [{ cardId: "card-1", variant: "SHOWCASE", quantity: 1 }] }, openedAt)).rejects.toThrow("Variante de carte ouverte invalide.");
  });

  it("rejects zero, negative, and incomplete pulled card rows", async () => {
    await expect(recordBoosterOpening({ boosterCount: 1, decrementCounter: false, note: "", pulls: [{ cardId: "card-1", variant: "NORMAL", quantity: 0 }] }, openedAt)).rejects.toThrow("Ouverture de boosters invalide.");
    await expect(recordBoosterOpening({ boosterCount: 1, decrementCounter: false, note: "", pulls: [{ cardId: "card-1", variant: "NORMAL", quantity: -1 }] }, openedAt)).rejects.toThrow("Ouverture de boosters invalide.");
    await expect(recordBoosterOpening({ boosterCount: 1, decrementCounter: false, note: "", pulls: [{ cardId: "card-1", variant: "NORMAL" }] }, openedAt)).rejects.toThrow("Ligne de carte ouverte incomplète.");
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("ignores intentionally empty pulled card rows and still allows header-only openings", async () => {
    prismaMock.boosterSettings.findFirst.mockResolvedValueOnce({ ...record, accrualAnchorAt: openedAt });
    prismaMock.boosterOpening.create.mockResolvedValueOnce(opening);

    await recordBoosterOpening({ boosterCount: 1, decrementCounter: false, note: "", pulls: [{ cardId: "", variant: undefined, quantity: "" }] }, openedAt);

    expect(prismaMock.boosterOpening.create).toHaveBeenCalled();
    expect(prismaMock.boosterOpeningCard.create).not.toHaveBeenCalled();
  });

  it("rejects invalid booster count", async () => {
    await expect(recordBoosterOpening({ boosterCount: 0, decrementCounter: true, note: "" }, openedAt)).rejects.toThrow("Ouverture de boosters invalide.");
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("trims optional notes and stores empty notes as undefined", async () => {
    prismaMock.boosterSettings.findFirst.mockResolvedValueOnce({ ...record, accrualAnchorAt: openedAt });
    prismaMock.boosterOpening.create.mockResolvedValueOnce({ ...opening, note: null });

    await recordBoosterOpening({ boosterCount: 1, decrementCounter: false, note: "   " }, openedAt);

    expect(prismaMock.boosterOpening.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ note: undefined }),
    });
  });
});
