import { prisma } from "@/lib/db";
import {
  calculateAccumulatedBoosters,
  getDefaultBoosterSettings,
  normalizeBoosterOpeningInput,
  normalizeBoosterSettingsInput,
  type BoosterCounterState,
  type BoosterOpeningInput,
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

export type BoosterOpeningView = {
  id: string;
  openedAt: string;
  boosterCount: number;
  decrementCounter: boolean;
  note: string | null;
};

export type BoosterOverviewView = BoosterSettingsView & {
  counter: BoosterCounterStateView;
  recentOpenings: BoosterOpeningView[];
};

type BoosterCounterEventDelegate = {
  aggregate: (args: { _sum: { quantityDelta: true } }) => Promise<{ _sum: { quantityDelta: number | null } }>;
  create: (args: { data: { type: "ACCRUAL" | "OPENING_DECREMENT"; quantityDelta: number; occurredAt: Date; note?: string; boosterOpeningId?: string } }) => Promise<unknown>;
};

type BoosterPrismaClient = {
  boosterSettings: typeof prisma.boosterSettings;
  boosterCounterEvent: BoosterCounterEventDelegate;
  boosterOpening: typeof prisma.boosterOpening;
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

function toOpeningView(record: { id: string; openedAt: Date; boosterCount: number; decrementCounter: boolean; note: string | null }): BoosterOpeningView {
  return {
    id: record.id,
    openedAt: record.openedAt.toISOString(),
    boosterCount: record.boosterCount,
    decrementCounter: record.decrementCounter,
    note: record.note,
  };
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
  const [record, ledgerQuantity, recentOpenings] = await Promise.all([
    prisma.boosterSettings.findFirst({ orderBy: { createdAt: "asc" } }),
    sumCounterEventQuantity(),
    prisma.boosterOpening.findMany({ orderBy: { openedAt: "desc" }, take: 5 }),
  ]);
  const settings = toView(record as BoosterSettingsRecord | null, now);
  const counter = calculateAccumulatedBoosters({
    boostersPerInterval: settings.boostersPerInterval,
    intervalCount: settings.intervalCount,
    intervalUnit: settings.intervalUnit,
    accrualAnchorAt: new Date(settings.accrualAnchorAt),
  }, now);

  return { ...settings, counter: toCounterView(counter, ledgerQuantity), recentOpenings: recentOpenings.map(toOpeningView) };
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

async function materializePendingAccrualIfNeeded(client: BoosterPrismaClient, settings: BoosterSettingsRecord, now: Date): Promise<void> {
  const pendingAccrual = calculateAccumulatedBoosters({
    boostersPerInterval: settings.boostersPerInterval,
    intervalCount: settings.intervalCount,
    intervalUnit: settings.intervalUnit,
    accrualAnchorAt: settings.accrualAnchorAt,
  }, now);

  if (pendingAccrual.accumulatedBoosters > 0) {
    await client.boosterCounterEvent.create({
      data: {
        type: "ACCRUAL",
        quantityDelta: pendingAccrual.accumulatedBoosters,
        occurredAt: now,
        note: "Accrual materialized before booster opening.",
      },
    });
  }

  if (pendingAccrual.completeIntervals > 0) {
    await client.boosterSettings.update({ where: { id: settings.id }, data: { accrualAnchorAt: now } });
  }
}

export async function recordBoosterOpening(input: BoosterOpeningInput, now = new Date()): Promise<BoosterOpeningView> {
  const openingInput = normalizeBoosterOpeningInput(input);

  const opening = await prisma.$transaction(async (tx) => {
    const client = tx as unknown as BoosterPrismaClient;
    const existing = await client.boosterSettings.findFirst({ orderBy: { createdAt: "asc" } });

    if (existing) {
      await materializePendingAccrualIfNeeded(client, existing as BoosterSettingsRecord, now);
    }

    const createdOpening = await client.boosterOpening.create({
      data: {
        openedAt: now,
        boosterCount: openingInput.boosterCount,
        decrementCounter: openingInput.decrementCounter,
        note: openingInput.note,
      },
    });

    if (openingInput.decrementCounter) {
      await client.boosterCounterEvent.create({
        data: {
          type: "OPENING_DECREMENT",
          quantityDelta: -openingInput.boosterCount,
          occurredAt: now,
          boosterOpeningId: createdOpening.id,
          note: "Décrément automatique lors d’une ouverture de boosters.",
        },
      });
    }

    return createdOpening;
  });

  return toOpeningView(opening);
}
