import { prisma } from "@/lib/db";
import {
  calculateAccumulatedBoosters,
  getDefaultBoosterSettings,
  normalizeBoosterSettingsInput,
  type BoosterCounterState,
  type BoosterSettingsInput,
  type NormalizedBoosterSettings,
} from "@/lib/domain/boosters";

export type BoosterSettingsView = NormalizedBoosterSettings & {
  id: string | null;
  accrualAnchorAt: string;
  createdAt: string | null;
  updatedAt: string | null;
};

export type BoosterCounterStateView = {
  accumulatedBoosters: number;
  completeIntervals: number;
  accrualAnchorAt: string;
  calculatedAt: string;
};

export type BoosterOverviewView = BoosterSettingsView & {
  counter: BoosterCounterStateView;
};

type BoosterSettingsRecord = {
  id: string;
  boostersPerInterval: number;
  intervalCount: number;
  intervalUnit: "DAY";
  accrualAnchorAt: Date;
  autoDecrementOnOpening: boolean;
  createdAt: Date;
  updatedAt: Date;
};

function defaultAnchorFor(now: Date): Date {
  return new Date(now.getTime());
}

function toView(record: BoosterSettingsRecord | null, now = new Date()): BoosterSettingsView {
  if (!record) {
    return {
      ...getDefaultBoosterSettings(),
      id: null,
      accrualAnchorAt: defaultAnchorFor(now).toISOString(),
      createdAt: null,
      updatedAt: null,
    };
  }

  return {
    id: record.id,
    boostersPerInterval: record.boostersPerInterval,
    intervalCount: record.intervalCount,
    intervalUnit: record.intervalUnit,
    accrualAnchorAt: record.accrualAnchorAt.toISOString(),
    autoDecrementOnOpening: record.autoDecrementOnOpening,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

function toCounterView(counter: BoosterCounterState): BoosterCounterStateView {
  return {
    accumulatedBoosters: counter.accumulatedBoosters,
    completeIntervals: counter.completeIntervals,
    accrualAnchorAt: counter.accrualAnchorAt.toISOString(),
    calculatedAt: counter.calculatedAt.toISOString(),
  };
}

export async function getBoosterSettings(now = new Date()): Promise<BoosterSettingsView> {
  const record = await prisma.boosterSettings.findFirst({ orderBy: { createdAt: "asc" } });
  return toView(record as BoosterSettingsRecord | null, now);
}

export async function getBoosterOverview(now = new Date()): Promise<BoosterOverviewView> {
  const record = await prisma.boosterSettings.findFirst({ orderBy: { createdAt: "asc" } });
  const settings = toView(record as BoosterSettingsRecord | null, now);
  const counter = calculateAccumulatedBoosters({
    boostersPerInterval: settings.boostersPerInterval,
    intervalCount: settings.intervalCount,
    intervalUnit: settings.intervalUnit,
    accrualAnchorAt: new Date(settings.accrualAnchorAt),
  }, now);

  return { ...settings, counter: toCounterView(counter) };
}

export async function updateBoosterSettings(input: BoosterSettingsInput): Promise<BoosterSettingsView> {
  const settings = normalizeBoosterSettingsInput(input);
  const existing = await prisma.boosterSettings.findFirst({ orderBy: { createdAt: "asc" }, select: { id: true } });
  const data = {
    boostersPerInterval: settings.boostersPerInterval,
    intervalCount: settings.intervalCount,
    intervalUnit: settings.intervalUnit,
    autoDecrementOnOpening: settings.autoDecrementOnOpening,
  };

  const record = existing
    ? await prisma.boosterSettings.update({ where: { id: existing.id }, data })
    : await prisma.boosterSettings.create({ data: { ...data, accrualAnchorAt: new Date() } });

  return toView(record as BoosterSettingsRecord);
}
