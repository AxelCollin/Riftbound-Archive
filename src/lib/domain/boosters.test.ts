import { describe, expect, it } from "vitest";

import { getDefaultBoosterSettings, normalizeBoosterSettingsInput } from "./boosters";

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
