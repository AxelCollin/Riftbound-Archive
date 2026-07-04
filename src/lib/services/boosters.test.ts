import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  boosterSettings: {
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
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

beforeEach(() => vi.clearAllMocks());

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
    prismaMock.boosterSettings.findFirst.mockResolvedValueOnce({ id: "settings-1" });
    prismaMock.boosterSettings.update.mockResolvedValueOnce(record);

    const result = await updateBoosterSettings({ boostersPerInterval: 2, intervalCount: 1, intervalUnit: "DAY", autoDecrementOnOpening: false });

    expect(prismaMock.boosterSettings.update).toHaveBeenCalledWith({
      where: { id: "settings-1" },
      data: { boostersPerInterval: 2, intervalCount: 1, intervalUnit: "DAY", autoDecrementOnOpening: false },
    });
    expect(result.boostersPerInterval).toBe(2);
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
