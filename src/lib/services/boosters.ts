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

type BoosterCounterEventDelegate = {
  aggregate: (args: { _sum: { quantityDelta: true } }) => Promise<{ _sum: { quantityDelta: number | null } }>;
  create: (args: { data: { type: "ACCRUAL"; quantityDelta: number; occurredAt: Date; note: string } }) => Promise<unknown>;
};

type BoosterPrismaClient = {
  boosterSettings: typeof prisma.boosterSettings;
  boosterCounterEvent: BoosterCounterEventDelegate;
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

function toCounterView(counter: BoosterCounterState, ledgerQuantity = 0): BoosterCounterStateView {
  return {
    accumulatedBoosters: ledgerQuantity + counter.accumulatedBoosters,
    completeIntervals: counter.completeIntervals,
    accrualAnchorAt: counter.accrualAnchorAt.toISOString(),
    calculatedAt: counter.calculatedAt.toISOString(),
  };
}

export async function getBoosterSettings(now = new Date()): Promise<BoosterSettingsView> {
  const record = await prisma.boosterSettings.findFirst({ orderBy: { createdAt: "asc" } });
  return toView(record as BoosterSettingsRecord | null, now);
}

async function sumCounterEventQuantity(client: BoosterPrismaClient = prisma as unknown as BoosterPrismaClient): Promise<number> {
  const aggregate = await client.boosterCounterEvent.aggregate({ _sum: { quantityDelta: true } });
  return aggregate._sum.quantityDelta ?? 0;
}

function hasAccrualSettingsChange(existing: BoosterSettingsRecord, settings: NormalizedBoosterSettings): boolean {
  return (
    existing.boostersPerInterval !== settings.boostersPerInterval ||
    existing.intervalCount !== settings.intervalCount ||
    existing.intervalUnit !== settings.intervalUnit
  );
}

export async function getBoosterOverview(now = new Date()): Promise<BoosterOverviewView> {
  const [record, ledgerQuantity] = await Promise.all([
    prisma.boosterSettings.findFirst({ orderBy: { createdAt: "asc" } }),
    sumCounterEventQuantity(),
  ]);
  const settings = toView(record as BoosterSettingsRecord | null, now);
  const counter = calculateAccumulatedBoosters({
    boostersPerInterval: settings.boostersPerInterval,
    intervalCount: settings.intervalCount,
    intervalUnit: settings.intervalUnit,
    accrualAnchorAt: new Date(settings.accrualAnchorAt),
  }, now);

  return { ...settings, counter: toCounterView(counter, ledgerQuantity) };
}

export async function updateBoosterSettings(input: BoosterSettingsInput, now = new Date()): Promise<BoosterSettingsView> {
  const settings = normalizeBoosterSettingsInput(input);
  const data = {
    boostersPerInterval: settings.boostersPerInterval,
    intervalCount: settings.intervalCount,
    intervalUnit: settings.intervalUnit,
    autoDecrementOnOpening: settings.autoDecrementOnOpening,
  };

  const record = await prisma.$transaction(async (tx) => {
    const client = tx as unknown as BoosterPrismaClient;
    const existing = await client.boosterSettings.findFirst({ orderBy: { createdAt: "asc" } });

    if (!existing) {
      return client.boosterSettings.create({ data: { ...data, accrualAnchorAt: now } });
    }

    const existingSettings = existing as BoosterSettingsRecord;

    if (!hasAccrualSettingsChange(existingSettings, settings)) {
      return client.boosterSettings.update({ where: { id: existingSettings.id }, data });
    }

    const pendingAccrual = calculateAccumulatedBoosters({
      boostersPerInterval: existingSettings.boostersPerInterval,
      intervalCount: existingSettings.intervalCount,
      intervalUnit: existingSettings.intervalUnit,
      accrualAnchorAt: existingSettings.accrualAnchorAt,
    }, now);

    if (pendingAccrual.accumulatedBoosters > 0) {
      await client.boosterCounterEvent.create({
        data: {
          type: "ACCRUAL",
          quantityDelta: pendingAccrual.accumulatedBoosters,
          occurredAt: now,
          note: "Accrual materialized before booster settings change.",
        },
      });
    }

    return client.boosterSettings.update({ where: { id: existingSettings.id }, data: { ...data, accrualAnchorAt: now } });
  });

  return toView(record as BoosterSettingsRecord);
}
