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
import { isTrackableCard } from "@/lib/domain/cards";
import { getAllowedVariants, type CardVariant } from "@/lib/domain/variants";
import { getDisplayCardName } from "@/lib/queries/collection";

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
  recordedCardCount: number;
};

export type BoosterCardOptionView = {
  cardId: string;
  displayName: string;
  allowedVariants: CardVariant[];
};

export type BoosterOverviewView = BoosterSettingsView & {
  counter: BoosterCounterStateView;
  recentOpenings: BoosterOpeningView[];
  cardOptions: BoosterCardOptionView[];
};

type BoosterCounterEventDelegate = {
  aggregate: (args: { _sum: { quantityDelta: true } }) => Promise<{ _sum: { quantityDelta: number | null } }>;
  create: (args: { data: { type: "ACCRUAL" | "OPENING_DECREMENT"; quantityDelta: number; occurredAt: Date; note?: string; boosterOpeningId?: string } }) => Promise<unknown>;
};

type BoosterPrismaClient = {
  boosterSettings: typeof prisma.boosterSettings;
  boosterCounterEvent: BoosterCounterEventDelegate;
  boosterOpening: typeof prisma.boosterOpening;
  boosterOpeningCard: typeof prisma.boosterOpeningCard;
  collectionEntry: typeof prisma.collectionEntry;
  collectionTransaction: typeof prisma.collectionTransaction;
  card: typeof prisma.card;
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

function toOpeningView(record: { id: string; openedAt: Date; boosterCount: number; decrementCounter: boolean; note: string | null; _count?: { cards: number } }): BoosterOpeningView {
  return {
    id: record.id,
    openedAt: record.openedAt.toISOString(),
    boosterCount: record.boosterCount,
    decrementCounter: record.decrementCounter,
    note: record.note,
    recordedCardCount: record._count?.cards ?? 0,
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
  const [record, ledgerQuantity, recentOpenings, cards] = await Promise.all([
    prisma.boosterSettings.findFirst({ orderBy: { createdAt: "asc" } }),
    sumCounterEventQuantity(),
    prisma.boosterOpening.findMany({ orderBy: { openedAt: "desc" }, take: 5, include: { _count: { select: { cards: true } } } }),
    prisma.card.findMany({
      where: { kind: { in: ["GAMEPLAY", "ENERGY"] } },
      select: { id: true, name: true, collectorNumber: true, rarity: true, kind: true, hasShowcase: true, set: { select: { code: true } }, translations: { where: { locale: { in: ["fr-FR", "fr"] } }, select: { locale: true, name: true } } },
      orderBy: [{ set: { code: "asc" } }, { collectorNumber: "asc" }, { name: "asc" }],
    }),
  ]);
  const settings = toView(record as BoosterSettingsRecord | null, now);
  const counter = calculateAccumulatedBoosters({
    boostersPerInterval: settings.boostersPerInterval,
    intervalCount: settings.intervalCount,
    intervalUnit: settings.intervalUnit,
    accrualAnchorAt: new Date(settings.accrualAnchorAt),
  }, now);

  const cardOptions = cards.map((card) => ({
    cardId: card.id,
    displayName: `${getDisplayCardName(card)}${card.set?.code ? ` · ${card.set.code}` : ""}${card.collectorNumber ? ` #${card.collectorNumber}` : ""}`,
    allowedVariants: getAllowedVariants(card),
  }));

  return { ...settings, counter: toCounterView(counter, ledgerQuantity), recentOpenings: recentOpenings.map(toOpeningView), cardOptions };
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

async function createDefaultBoosterSettingsForOpening(client: BoosterPrismaClient, now: Date): Promise<BoosterSettingsRecord> {
  const defaults = getDefaultBoosterSettings();

  return client.boosterSettings.create({
    data: {
      boostersPerInterval: defaults.boostersPerInterval,
      intervalCount: defaults.intervalCount,
      intervalUnit: defaults.intervalUnit,
      autoDecrementOnOpening: defaults.autoDecrementOnOpening,
      accrualAnchorAt: now,
    },
  }) as Promise<BoosterSettingsRecord>;
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
    await client.boosterSettings.update({ where: { id: settings.id }, data: { accrualAnchorAt: pendingAccrual.nextAccrualAnchorAt } });
  }
}

async function validatePulledCards(client: BoosterPrismaClient, pulls: { cardId: string; variant: CardVariant; quantity: number }[]): Promise<void> {
  for (const pull of pulls) {
    const card = await client.card.findUnique({ where: { id: pull.cardId }, select: { id: true, name: true, rarity: true, kind: true, hasShowcase: true } });

    if (!card) {
      throw new Error("Carte ouverte introuvable.");
    }

    if (!isTrackableCard(card)) {
      throw new Error("Seules les cartes GAMEPLAY et ENERGY peuvent être ajoutées à la collection.");
    }

    if (!getAllowedVariants(card).includes(pull.variant)) {
      throw new Error("Variante de carte ouverte invalide.");
    }
  }
}

async function writePulledCardsToCollection(client: BoosterPrismaClient, openingId: string, pulls: { cardId: string; variant: CardVariant; quantity: number }[]): Promise<void> {
  for (const pull of pulls) {
    await client.boosterOpeningCard.create({
      data: { boosterOpeningId: openingId, cardId: pull.cardId, variant: pull.variant, quantity: pull.quantity },
    });
    await client.collectionTransaction.create({
      data: {
        cardId: pull.cardId,
        variant: pull.variant,
        type: "ADD",
        quantity: pull.quantity,
        source: `booster-opening:${openingId}`,
        note: "Ouverture de booster",
      },
    });
    await client.collectionEntry.upsert({
      where: { cardId_variant: { cardId: pull.cardId, variant: pull.variant } },
      create: { cardId: pull.cardId, variant: pull.variant, quantity: pull.quantity },
      update: { quantity: { increment: pull.quantity } },
    });
  }
}

export async function recordBoosterOpening(input: BoosterOpeningInput, now = new Date()): Promise<BoosterOpeningView> {
  const openingInput = normalizeBoosterOpeningInput(input);

  const opening = await prisma.$transaction(async (tx) => {
    const client = tx as unknown as BoosterPrismaClient;
    const existing = await client.boosterSettings.findFirst({ orderBy: { createdAt: "asc" } });

    if (existing) {
      await materializePendingAccrualIfNeeded(client, existing as BoosterSettingsRecord, now);
    } else {
      await createDefaultBoosterSettingsForOpening(client, now);
    }

    await validatePulledCards(client, openingInput.pulls);

    const createdOpening = await client.boosterOpening.create({
      data: {
        openedAt: now,
        boosterCount: openingInput.boosterCount,
        decrementCounter: openingInput.decrementCounter,
        note: openingInput.note,
      },
    });

    await writePulledCardsToCollection(client, createdOpening.id, openingInput.pulls);

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

    return { ...createdOpening, _count: { cards: openingInput.pulls.length } };
  });

  return toOpeningView(opening);
}
