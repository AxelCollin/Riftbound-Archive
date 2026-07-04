import { z } from "zod";
import type { BoosterIntervalUnit } from "@prisma/client";

export const DEFAULT_BOOSTERS_PER_INTERVAL = 1;
export const DEFAULT_BOOSTER_INTERVAL_COUNT = 1;
export const DEFAULT_BOOSTER_INTERVAL_UNIT: BoosterIntervalUnit = "DAY";
export const DEFAULT_AUTO_DECREMENT_ON_OPENING = true;

const booleanInputSchema = z.union([z.boolean(), z.literal("true"), z.literal("false"), z.literal("on")]);
const requiredCoercedIntegerSchema = z.preprocess((value) => {
  if (typeof value === "string" && value.trim() === "") {
    return undefined;
  }

  return value;
}, z.coerce.number().int());

export const boosterSettingsInputSchema = z.object({
  boostersPerInterval: requiredCoercedIntegerSchema.pipe(z.number().nonnegative()),
  intervalCount: z.coerce.number().int().positive(),
  intervalUnit: z.literal("DAY"),
  autoDecrementOnOpening: booleanInputSchema,
});

export const boosterOpeningInputSchema = z.object({
  boosterCount: requiredCoercedIntegerSchema.pipe(z.number().positive()),
  decrementCounter: booleanInputSchema,
  note: z.preprocess((value) => {
    if (typeof value !== "string") {
      return undefined;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }, z.string().max(1000).optional()),
});

export type BoosterSettingsInput = {
  boostersPerInterval: unknown;
  intervalCount: unknown;
  intervalUnit: unknown;
  autoDecrementOnOpening: unknown;
};

export type BoosterOpeningInput = {
  boosterCount: unknown;
  decrementCounter: unknown;
  note?: unknown;
};

export type NormalizedBoosterOpeningInput = {
  boosterCount: number;
  decrementCounter: boolean;
  note?: string;
};

export type NormalizedBoosterSettings = {
  boostersPerInterval: number;
  intervalCount: number;
  intervalUnit: BoosterIntervalUnit;
  autoDecrementOnOpening: boolean;
};

export type BoosterAccrualSettings = Pick<NormalizedBoosterSettings, "boostersPerInterval" | "intervalCount" | "intervalUnit"> & {
  accrualAnchorAt: Date;
};

export type BoosterCounterState = {
  accumulatedBoosters: number;
  completeIntervals: number;
  accrualAnchorAt: Date;
  nextAccrualAnchorAt: Date;
  calculatedAt: Date;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function normalizeBoosterSettingsInput(input: BoosterSettingsInput): NormalizedBoosterSettings {
  const parsed = boosterSettingsInputSchema.safeParse(input);

  if (!parsed.success) {
    throw new Error("Paramètres de boosters invalides.");
  }

  return {
    boostersPerInterval: parsed.data.boostersPerInterval,
    intervalCount: parsed.data.intervalCount,
    intervalUnit: parsed.data.intervalUnit,
    autoDecrementOnOpening: parsed.data.autoDecrementOnOpening === true || parsed.data.autoDecrementOnOpening === "true" || parsed.data.autoDecrementOnOpening === "on",
  };
}

export function normalizeBoosterOpeningInput(input: BoosterOpeningInput): NormalizedBoosterOpeningInput {
  const parsed = boosterOpeningInputSchema.safeParse(input);

  if (!parsed.success) {
    throw new Error("Ouverture de boosters invalide.");
  }

  return {
    boosterCount: parsed.data.boosterCount,
    decrementCounter: parsed.data.decrementCounter === true || parsed.data.decrementCounter === "true" || parsed.data.decrementCounter === "on",
    note: parsed.data.note,
  };
}

export function getDefaultBoosterSettings(): NormalizedBoosterSettings {
  return {
    boostersPerInterval: DEFAULT_BOOSTERS_PER_INTERVAL,
    intervalCount: DEFAULT_BOOSTER_INTERVAL_COUNT,
    intervalUnit: DEFAULT_BOOSTER_INTERVAL_UNIT,
    autoDecrementOnOpening: DEFAULT_AUTO_DECREMENT_ON_OPENING,
  };
}

export function calculateAccumulatedBoosters(settings: BoosterAccrualSettings, now: Date): BoosterCounterState {
  const calculatedAt = new Date(now.getTime());
  const accrualAnchorAt = new Date(settings.accrualAnchorAt.getTime());

  if (settings.boostersPerInterval <= 0 || settings.intervalCount <= 0 || calculatedAt.getTime() <= accrualAnchorAt.getTime()) {
    return { accumulatedBoosters: 0, completeIntervals: 0, accrualAnchorAt, nextAccrualAnchorAt: accrualAnchorAt, calculatedAt };
  }

  if (settings.intervalUnit !== "DAY") {
    throw new Error("Unité d’intervalle de boosters non prise en charge.");
  }

  const intervalMs = settings.intervalCount * MS_PER_DAY;
  const elapsedMs = calculatedAt.getTime() - accrualAnchorAt.getTime();
  const completeIntervals = Math.floor(elapsedMs / intervalMs);

  return {
    accumulatedBoosters: completeIntervals * settings.boostersPerInterval,
    completeIntervals,
    accrualAnchorAt,
    nextAccrualAnchorAt: new Date(accrualAnchorAt.getTime() + completeIntervals * intervalMs),
    calculatedAt,
  };
}
