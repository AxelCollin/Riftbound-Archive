import { describe, expect, it } from "vitest";

import { calculateAccumulatedBoosters, getDefaultBoosterSettings, normalizeBoosterOpeningInput, normalizeBoosterSettingsInput } from "./boosters";

describe("booster settings domain", () => {
  it("returns the Phase 7A default booster settings", () => {
    expect(getDefaultBoosterSettings()).toEqual({
      boostersPerInterval: 1,
      intervalCount: 1,
      intervalUnit: "DAY",
      autoDecrementOnOpening: true,
    });
  });

  it("normalizes valid settings form input", () => {
    expect(normalizeBoosterSettingsInput({
      boostersPerInterval: "2",
      intervalCount: "1",
      intervalUnit: "DAY",
      autoDecrementOnOpening: "on",
    })).toEqual({
      boostersPerInterval: 2,
      intervalCount: 1,
      intervalUnit: "DAY",
      autoDecrementOnOpening: true,
    });
  });

  it("accepts numeric zero daily increment to pause accrual", () => {
    expect(normalizeBoosterSettingsInput({
      boostersPerInterval: 0,
      intervalCount: 1,
      intervalUnit: "DAY",
      autoDecrementOnOpening: false,
    }).boostersPerInterval).toBe(0);
  });

  it("accepts string zero daily increment to pause accrual", () => {
    expect(normalizeBoosterSettingsInput({
      boostersPerInterval: "0",
      intervalCount: 1,
      intervalUnit: "DAY",
      autoDecrementOnOpening: false,
    }).boostersPerInterval).toBe(0);
  });

  it("rejects blank daily increment values", () => {
    expect(() => normalizeBoosterSettingsInput({ boostersPerInterval: "", intervalCount: 1, intervalUnit: "DAY", autoDecrementOnOpening: true })).toThrow("Paramètres de boosters invalides.");
    expect(() => normalizeBoosterSettingsInput({ boostersPerInterval: "   ", intervalCount: 1, intervalUnit: "DAY", autoDecrementOnOpening: true })).toThrow("Paramètres de boosters invalides.");
  });

  it("rejects invalid numeric and boolean settings", () => {
    expect(() => normalizeBoosterSettingsInput({ boostersPerInterval: -1, intervalCount: 1, intervalUnit: "DAY", autoDecrementOnOpening: true })).toThrow("Paramètres de boosters invalides.");
    expect(() => normalizeBoosterSettingsInput({ boostersPerInterval: 1.5, intervalCount: 1, intervalUnit: "DAY", autoDecrementOnOpening: true })).toThrow("Paramètres de boosters invalides.");
    expect(() => normalizeBoosterSettingsInput({ boostersPerInterval: 1, intervalCount: 0, intervalUnit: "DAY", autoDecrementOnOpening: true })).toThrow("Paramètres de boosters invalides.");
    expect(() => normalizeBoosterSettingsInput({ boostersPerInterval: 1, intervalCount: 1, intervalUnit: "DAY", autoDecrementOnOpening: "yes" })).toThrow("Paramètres de boosters invalides.");
  });
});

describe("booster opening domain", () => {
  const baseInput = {
    boosterCount: 1,
    decrementCounter: false,
    note: "",
  };

  it("ignores fixed form pull rows that submit blank strings", () => {
    expect(normalizeBoosterOpeningInput({
      ...baseInput,
      pulls: [{ cardId: "", variant: "", quantity: "" }],
    }).pulls).toEqual([]);
  });

  it("trims blank card ids consistently before empty-row handling", () => {
    expect(normalizeBoosterOpeningInput({
      ...baseInput,
      pulls: [{ cardId: "   ", variant: "   ", quantity: "   " }],
    }).pulls).toEqual([]);
  });

  it("rejects partially filled pull rows after blank variant normalization", () => {
    expect(() => normalizeBoosterOpeningInput({
      ...baseInput,
      pulls: [{ cardId: "card-1", variant: "", quantity: "1" }],
    })).toThrow("Ligne de carte ouverte incomplète.");
  });

  it("rejects invalid non-empty pulled variants", () => {
    expect(() => normalizeBoosterOpeningInput({
      ...baseInput,
      pulls: [{ cardId: "card-1", variant: "ETCHED", quantity: "1" }],
    })).toThrow("Ouverture de boosters invalide.");
  });
});

describe("accumulated booster counter domain", () => {
  const anchor = new Date("2026-07-01T00:00:00.000Z");

  function calculate(now: string, overrides = {}) {
    return calculateAccumulatedBoosters({
      boostersPerInterval: 1,
      intervalCount: 1,
      intervalUnit: "DAY",
      accrualAnchorAt: anchor,
      ...overrides,
    }, new Date(now));
  }

  it("returns 0 after 0 complete days", () => {
    expect(calculate("2026-07-01T23:59:59.999Z").accumulatedBoosters).toBe(0);
  });

  it("returns 1 after 1 complete day", () => {
    expect(calculate("2026-07-02T00:00:00.000Z").accumulatedBoosters).toBe(1);
  });

  it("returns 3 after 3 complete days", () => {
    expect(calculate("2026-07-04T00:00:00.000Z").accumulatedBoosters).toBe(3);
  });

  it("does not count a partial day", () => {
    expect(calculate("2026-07-03T23:59:59.999Z").accumulatedBoosters).toBe(2);
  });

  it("exposes the last materialized interval boundary separately from the calculation time", () => {
    const counter = calculate("2026-07-04T12:00:00.000Z");

    expect(counter.accumulatedBoosters).toBe(3);
    expect(counter.completeIntervals).toBe(3);
    expect(counter.nextAccrualAnchorAt.toISOString()).toBe("2026-07-04T00:00:00.000Z");
    expect(counter.calculatedAt.toISOString()).toBe("2026-07-04T12:00:00.000Z");
  });

  it("returns 0 when now is before the accrual anchor", () => {
    expect(calculate("2026-06-30T23:59:59.999Z").accumulatedBoosters).toBe(0);
  });

  it("returns 0 when boosters per interval is 0", () => {
    expect(calculate("2026-07-04T00:00:00.000Z", { boostersPerInterval: 0 }).accumulatedBoosters).toBe(0);
  });

  it("multiplies boosters per interval by complete intervals", () => {
    expect(calculate("2026-07-04T00:00:00.000Z", { boostersPerInterval: 2 }).accumulatedBoosters).toBe(6);
  });

  it("supports interval counts greater than 1", () => {
    expect(calculate("2026-07-04T23:59:59.999Z", { intervalCount: 2 }).accumulatedBoosters).toBe(1);
    expect(calculate("2026-07-05T00:00:00.000Z", { intervalCount: 2 }).accumulatedBoosters).toBe(2);
  });
});
