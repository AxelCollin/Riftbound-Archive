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

export type BoosterSettingsInput = {
  boostersPerInterval: unknown;
  intervalCount: unknown;
  intervalUnit: unknown;
  autoDecrementOnOpening: unknown;
};

export type NormalizedBoosterSettings = {
  boostersPerInterval: number;
  intervalCount: number;
  intervalUnit: BoosterIntervalUnit;
  autoDecrementOnOpening: boolean;
};

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

export function getDefaultBoosterSettings(): NormalizedBoosterSettings {
  return {
    boostersPerInterval: DEFAULT_BOOSTERS_PER_INTERVAL,
    intervalCount: DEFAULT_BOOSTER_INTERVAL_COUNT,
    intervalUnit: DEFAULT_BOOSTER_INTERVAL_UNIT,
    autoDecrementOnOpening: DEFAULT_AUTO_DECREMENT_ON_OPENING,
  };
}
