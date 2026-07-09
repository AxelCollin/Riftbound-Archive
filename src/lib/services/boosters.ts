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
import { mapLegacyCardVariantToPhysicalFinish, type PhysicalFinish } from "@/lib/domain/physical-finishes";
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
  status: "RECORDED" | "ROLLED_BACK";
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

export type BoosterOpeningSummaryPullView = {
  cardId: string;
  displayName: string;
  setCode: string | null;
  collectorNumber: string | null;
  variant: CardVariant;
  physicalFinish: PhysicalFinish | null;
  quantity: number;
  collectionQuantityAfterOpening: number;
  wasNewCollectionEntry: boolean;
};

export type BoosterOpeningSummaryView = {
  id: string;
  openedAt: string;
  boosterCount: number;
  decrementCounter: boolean;
  distinctCardRows: number;
  totalCardQuantity: number;
  newlyCreatedCollectionEntries: number;
  incrementedCollectionEntries: number;
  totalCardsAddedToCollection: number;
  status: "RECORDED" | "ROLLED_BACK";
  canRollback: boolean;
  rollbackBlockedReason: string | null;
  pulls: BoosterOpeningSummaryPullView[];
};

type BoosterCounterEventDelegate = {
  aggregate: (args: { _sum: { quantityDelta: true } }) => Promise<{ _sum: { quantityDelta: number | null } }>;
  create: (args: { data: { type: "ACCRUAL" | "OPENING_DECREMENT" | "ROLLBACK"; quantityDelta: number; occurredAt: Date; note?: string; boosterOpeningId?: string } }) => Promise<unknown>;
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

type BoosterOpeningCardRecord = { cardId: string; variant: CardVariant; physicalFinish?: PhysicalFinish | null; quantity: number };

function getEffectiveBoosterPhysicalFinish(record: { variant: CardVariant; physicalFinish?: PhysicalFinish | null }): PhysicalFinish | null {
  return record.physicalFinish ?? mapLegacyCardVariantToPhysicalFinish(record.variant);
}

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

function toOpeningView(record: { id: string; openedAt: Date; boosterCount: number; decrementCounter: boolean; status?: "RECORDED" | "ROLLED_BACK"; note: string | null; _count?: { cards: number } }): BoosterOpeningView {
  return {
    id: record.id,
    openedAt: record.openedAt.toISOString(),
    boosterCount: record.boosterCount,
    decrementCounter: record.decrementCounter,
    note: record.note,
    recordedCardCount: record._count?.cards ?? 0,
    status: record.status ?? "RECORDED",
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
      select: { id: true, name: true, collectorNumber: true, rarity: true, kind: true, gameplayType: true, collectorCategory: true, hasShowcase: true, set: { select: { code: true } }, translations: { where: { locale: { in: ["fr-FR", "fr"] } }, select: { locale: true, name: true } } },
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

  const cardOptions = cards.filter(isTrackableCard).map((card) => ({
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
    const card = await client.card.findUnique({ where: { id: pull.cardId }, select: { id: true, name: true, rarity: true, kind: true, gameplayType: true, collectorCategory: true, hasShowcase: true } });

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
    const physicalFinish = mapLegacyCardVariantToPhysicalFinish(pull.variant);

    await client.boosterOpeningCard.create({
      data: { boosterOpeningId: openingId, cardId: pull.cardId, variant: pull.variant, physicalFinish, cardLanguage: "UNKNOWN", quantity: pull.quantity },
    });
    await client.collectionTransaction.create({
      data: {
        cardId: pull.cardId,
        variant: pull.variant,
        physicalFinish,
        cardLanguage: "UNKNOWN",
        type: "ADD",
        quantity: pull.quantity,
        source: `booster-opening:${openingId}`,
        note: "Ouverture de booster",
      },
    });
    await client.collectionEntry.upsert({
      where: { cardId_variant_cardLanguage: { cardId: pull.cardId, variant: pull.variant, cardLanguage: "UNKNOWN" } },
      create: { cardId: pull.cardId, variant: pull.variant, physicalFinish, cardLanguage: "UNKNOWN", quantity: pull.quantity },
      update: { quantity: { increment: pull.quantity } },
    });
  }
}

export async function getBoosterOpeningSummary(openingId?: string | null): Promise<BoosterOpeningSummaryView | null> {
  const safeOpeningId = openingId?.trim();

  if (!safeOpeningId) {
    return null;
  }

  const opening = await prisma.boosterOpening.findUnique({
    where: { id: safeOpeningId },
    include: {
      cards: {
        orderBy: [{ card: { set: { code: "asc" } } }, { card: { collectorNumber: "asc" } }, { card: { name: "asc" } }],
        include: {
          card: {
            select: {
              id: true,
              name: true,
              collectorNumber: true,
              set: { select: { code: true } },
              translations: { where: { locale: { in: ["fr-FR", "fr-fr", "fr", "en-US", "en"] } }, select: { locale: true, name: true } },
            },
          },
        },
      },
    },
  });

  if (!opening) {
    return null;
  }

  const source = `booster-opening:${opening.id}`;
  const collectionEntryWhere = opening.cards.length > 0
    ? { OR: opening.cards.map((pull) => ({ cardId: pull.cardId, variant: pull.variant })) }
    : { id: { in: [] } };

  const [transactions, collectionEntries] = await Promise.all([
    prisma.collectionTransaction.findMany({
      where: { source },
      select: { cardId: true, variant: true, cardLanguage: true, quantity: true },
    }),
    prisma.collectionEntry.findMany({
      where: collectionEntryWhere,
      select: { cardId: true, variant: true, cardLanguage: true, quantity: true },
    }),
  ]);

  const transactionQuantityByKey = new Map<string, number>();
  for (const transaction of transactions) {
    const key = `${transaction.cardId}:${transaction.variant}`;
    transactionQuantityByKey.set(key, (transactionQuantityByKey.get(key) ?? 0) + transaction.quantity);
  }

  const collectionQuantityByKey = new Map(collectionEntries.map((entry) => [`${entry.cardId}:${entry.variant}`, entry.quantity]));

  const pulls = opening.cards.map((pull) => {
    const key = `${pull.cardId}:${pull.variant}`;
    const collectionQuantityAfterOpening = collectionQuantityByKey.get(key) ?? 0;
    const transactionQuantity = transactionQuantityByKey.get(key) ?? pull.quantity;
    return {
      cardId: pull.cardId,
      displayName: getDisplayCardName(pull.card),
      setCode: pull.card.set?.code ?? null,
      collectorNumber: pull.card.collectorNumber,
      variant: pull.variant,
      physicalFinish: getEffectiveBoosterPhysicalFinish(pull),
      quantity: pull.quantity,
      collectionQuantityAfterOpening,
      wasNewCollectionEntry: collectionQuantityAfterOpening === transactionQuantity,
    };
  });

  const totalCardQuantity = pulls.reduce((total, pull) => total + pull.quantity, 0);
  const newlyCreatedCollectionEntries = pulls.filter((pull) => pull.wasNewCollectionEntry).length;

  return {
    id: opening.id,
    openedAt: opening.openedAt.toISOString(),
    boosterCount: opening.boosterCount,
    decrementCounter: opening.decrementCounter,
    distinctCardRows: pulls.length,
    totalCardQuantity,
    newlyCreatedCollectionEntries,
    incrementedCollectionEntries: pulls.length - newlyCreatedCollectionEntries,
    totalCardsAddedToCollection: transactions.reduce((total, transaction) => total + transaction.quantity, 0),
    status: opening.status,
    canRollback: opening.status === "RECORDED" && getRollbackBlockedReason(opening.status, opening.cards, transactions, collectionEntries) === null,
    rollbackBlockedReason: getRollbackBlockedReason(opening.status, opening.cards, transactions, collectionEntries),
    pulls,
  };
}

function getRollbackBlockedReason(
  status: "RECORDED" | "ROLLED_BACK",
  cards: BoosterOpeningCardRecord[],
  transactions: { cardId: string; variant: CardVariant; quantity: number; type?: string }[],
  entries: { cardId: string; variant: CardVariant; quantity: number }[],
): string | null {
  if (status === "ROLLED_BACK") return "Cette ouverture a déjà été annulée";

  const openingQuantityByKey = new Map<string, number>();
  for (const card of cards) {
    const key = `${card.cardId}:${card.variant}`;
    openingQuantityByKey.set(key, (openingQuantityByKey.get(key) ?? 0) + card.quantity);
  }

  const transactionQuantityByKey = new Map<string, number>();
  for (const transaction of transactions) {
    if (transaction.type && transaction.type !== "ADD") continue;
    const key = `${transaction.cardId}:${transaction.variant}`;
    transactionQuantityByKey.set(key, (transactionQuantityByKey.get(key) ?? 0) + transaction.quantity);
  }
  const entryQuantityByKey = new Map(entries.map((entry) => [`${entry.cardId}:${entry.variant}`, entry.quantity]));

  for (const [key, openingQuantity] of openingQuantityByKey) {
    if (transactionQuantityByKey.get(key) !== openingQuantity) return "Annulation impossible : transactions d’ouverture incohérentes";
    const currentQuantity = entryQuantityByKey.get(key);
    if (currentQuantity === undefined) return "Annulation impossible : entrée de collection introuvable";
    if (currentQuantity - openingQuantity < 0) return "Annulation impossible : la collection ne contient plus assez d’exemplaires";
  }

  for (const key of transactionQuantityByKey.keys()) {
    if (!openingQuantityByKey.has(key)) return "Annulation impossible : transactions d’ouverture incohérentes";
  }

  return null;
}

export async function rollbackBoosterOpening(openingId: string, now = new Date()): Promise<BoosterOpeningView> {
  const safeOpeningId = openingId.trim();
  if (!safeOpeningId) throw new Error("Ouverture de booster introuvable.");

  const opening = await prisma.$transaction(async (tx) => {
    const client = tx as unknown as BoosterPrismaClient;
    const record = await client.boosterOpening.findUnique({
      where: { id: safeOpeningId },
      include: { cards: true, counterEvents: true, _count: { select: { cards: true } } },
    });

    if (!record) throw new Error("Ouverture de booster introuvable.");
    if (record.status === "ROLLED_BACK") throw new Error("Cette ouverture a déjà été annulée");

    const source = `booster-opening:${record.id}`;
    const rollbackSource = `booster-opening-rollback:${record.id}`;
    const collectionEntryWhere = record.cards.length > 0
      ? { OR: record.cards.map((pull) => ({ cardId: pull.cardId, variant: pull.variant })) }
      : { id: { in: [] } };
    const [transactions, entries] = await Promise.all([
      client.collectionTransaction.findMany({ where: { source, type: "ADD" }, select: { cardId: true, variant: true, cardLanguage: true, quantity: true, type: true } }),
      client.collectionEntry.findMany({ where: collectionEntryWhere, select: { cardId: true, variant: true, cardLanguage: true, quantity: true } }),
    ]);

    const blockedReason = getRollbackBlockedReason(record.status, record.cards, transactions, entries);
    if (blockedReason) throw new Error(blockedReason);

    for (const card of record.cards) {
      await client.collectionEntry.update({
        where: { cardId_variant_cardLanguage: { cardId: card.cardId, variant: card.variant, cardLanguage: card.cardLanguage ?? "UNKNOWN" } },
        data: { quantity: { decrement: card.quantity } },
      });
      await client.collectionTransaction.create({
        data: {
          cardId: card.cardId,
          variant: card.variant,
          physicalFinish: getEffectiveBoosterPhysicalFinish(card),
          type: "REMOVE",
          quantity: card.quantity,
          source: rollbackSource,
          note: "Annulation d’ouverture de booster",
        },
      });
    }

    const hasOpeningDecrement = record.counterEvents.some((event) => event.type === "OPENING_DECREMENT");
    if (record.decrementCounter && hasOpeningDecrement) {
      await client.boosterCounterEvent.create({
        data: {
          type: "ROLLBACK",
          quantityDelta: record.boosterCount,
          occurredAt: now,
          boosterOpeningId: record.id,
          note: "Annulation du décrément d’ouverture de booster",
        },
      });
    }

    return client.boosterOpening.update({ where: { id: record.id }, data: { status: "ROLLED_BACK" }, include: { _count: { select: { cards: true } } } });
  });

  return toOpeningView(opening);
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
