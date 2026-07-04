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
  $transaction: vi.fn(async (callback) => callback(prismaMock)),
}));

vi.mock("@/lib/db", () => ({ prisma: prismaMock }));

import { getBoosterOverview, getBoosterSettings, updateBoosterSettings } from "./boosters";

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
