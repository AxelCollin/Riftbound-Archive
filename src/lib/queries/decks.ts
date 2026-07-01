import type { DeckAllocationStrategy, DeckCardVariantPreference, DeckStatus } from "@prisma/client";
import { prisma } from "../db";
import { getCardAvailability, type DeckAllocationSet } from "../domain/availability";
import { getBinderReservation } from "../domain/binder";
import type { CardKind, CardRarity } from "../domain/cards";
import { createOwnedVariantCounts } from "../domain/collection-quantities";
import { calculateDeckMissingCards } from "../domain/deck-missing";
import { getAllowedVariants, getVariantCount, type CardVariant, type VariantCounts } from "../domain/variants";
import type { CardPrintTreatment } from "../formatters/cards";
import { getDisplayCardName } from "./collection";

export type DeckListRow = {
  deckId: string;
  name: string;
  status: DeckStatus;
  allocationStrategy: DeckAllocationStrategy;
  description: string | null;
  deckCardLineCount: number;
  requiredCardQuantity: number;
  allocationLineCount: number;
  allocatedCardQuantity: number;
  createdAt: string;
  updatedAt: string;
};

export type DeckListSummary = {
  totalDecks: number;
  theoreticalDecks: number;
  assembledDecks: number;
  archivedDecks: number;
  totalRequiredCards: number;
  totalAllocatedCards: number;
};

export type DeckListPageData = {
  rows: DeckListRow[];
  summary: DeckListSummary;
};

type DeckListRecord = {
  id: string;
  name: string;
  status: DeckStatus;
  allocationStrategy: DeckAllocationStrategy;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  deckCards: { quantity: number }[];
  allocations: { quantity: number }[];
  _count: {
    deckCards: number;
    allocations: number;
  };
};

function getDeckStatusSortRank(status: DeckStatus): number {
  return status === "ARCHIVED" ? 1 : 0;
}

export function createDeckListRows(decks: DeckListRecord[]): DeckListRow[] {
  return [...decks]
    .sort((left, right) => {
      const statusDelta = getDeckStatusSortRank(left.status) - getDeckStatusSortRank(right.status);
      if (statusDelta !== 0) {
        return statusDelta;
      }

      const updatedAtDelta = right.updatedAt.getTime() - left.updatedAt.getTime();
      if (updatedAtDelta !== 0) {
        return updatedAtDelta;
      }

      return left.name.localeCompare(right.name, "fr");
    })
    .map((deck) => ({
      deckId: deck.id,
      name: deck.name,
      status: deck.status,
      allocationStrategy: deck.allocationStrategy,
      description: deck.description,
      deckCardLineCount: deck._count.deckCards,
      requiredCardQuantity: deck.deckCards.reduce((total, deckCard) => total + deckCard.quantity, 0),
      allocationLineCount: deck._count.allocations,
      allocatedCardQuantity: deck.allocations.reduce((total, allocation) => total + allocation.quantity, 0),
      createdAt: deck.createdAt.toISOString(),
      updatedAt: deck.updatedAt.toISOString(),
    }));
}

export function summarizeDeckListRows(rows: DeckListRow[]): DeckListSummary {
  return rows.reduce<DeckListSummary>(
    (summary, row) => ({
      totalDecks: summary.totalDecks + 1,
      theoreticalDecks: summary.theoreticalDecks + (row.status === "THEORETICAL" ? 1 : 0),
      assembledDecks: summary.assembledDecks + (row.status === "ASSEMBLED" ? 1 : 0),
      archivedDecks: summary.archivedDecks + (row.status === "ARCHIVED" ? 1 : 0),
      totalRequiredCards: summary.totalRequiredCards + row.requiredCardQuantity,
      totalAllocatedCards: summary.totalAllocatedCards + row.allocatedCardQuantity,
    }),
    {
      totalDecks: 0,
      theoreticalDecks: 0,
      assembledDecks: 0,
      archivedDecks: 0,
      totalRequiredCards: 0,
      totalAllocatedCards: 0,
    },
  );
}

export async function getDeckListPageData(): Promise<DeckListPageData> {
  const decks = await prisma.deck.findMany({
    orderBy: [
      { updatedAt: "desc" },
      { name: "asc" },
    ],
    select: {
      id: true,
      name: true,
      status: true,
      allocationStrategy: true,
      description: true,
      createdAt: true,
      updatedAt: true,
      deckCards: { select: { quantity: true } },
      allocations: { select: { quantity: true } },
      _count: { select: { deckCards: true, allocations: true } },
    },
  });

  const rows = createDeckListRows(decks);

  return {
    rows,
    summary: summarizeDeckListRows(rows),
  };
}

export type DeckEditData = {
  deckId: string;
  name: string;
  description: string | null;
  allocationStrategy: DeckAllocationStrategy;
  status: DeckStatus;
};

export async function getDeckEditData(deckId: string): Promise<DeckEditData | null> {
  const deck = await prisma.deck.findUnique({
    where: { id: deckId },
    select: {
      id: true,
      name: true,
      description: true,
      allocationStrategy: true,
      status: true,
    },
  });

  if (!deck) {
    return null;
  }

  return {
    deckId: deck.id,
    name: deck.name,
    description: deck.description,
    allocationStrategy: deck.allocationStrategy,
    status: deck.status,
  };
}


type DeckDetailCardRecord = {
  id: string;
  name: string;
  collectorNumber: string | null;
  rarity: CardRarity;
  kind: CardKind;
  printTreatment: CardPrintTreatment;
  hasShowcase: boolean;
  set: { code: string; name: string };
  translations: { locale: string; name: string }[];
  collectionEntries?: { variant: CardVariant; quantity: number }[];
};

type DeckDetailRequirementRecord = {
  id: string;
  cardId: string;
  quantity: number;
  preferredVariant: DeckCardVariantPreference;
  card: DeckDetailCardRecord;
};

type DeckDetailAllocationRecord = {
  id: string;
  cardId: string;
  variant: CardVariant;
  quantity: number;
  card: DeckDetailCardRecord;
};

type DeckDetailRecord = {
  id: string;
  name: string;
  description: string | null;
  status: DeckStatus;
  allocationStrategy: DeckAllocationStrategy;
  createdAt: Date;
  updatedAt: Date;
  deckCards: DeckDetailRequirementRecord[];
  allocations: DeckDetailAllocationRecord[];
};

export type DeckDetailCardDisplay = {
  cardId: string;
  displayName: string;
  officialName: string;
  collectorNumber: string;
  rarity: CardRarity;
  kind: CardKind;
  printTreatment: CardPrintTreatment;
  hasShowcase: boolean;
  set: { code: string; name: string };
};

export type DeckRequirementRow = DeckDetailCardDisplay & {
  deckCardId: string;
  preferredVariant: DeckCardVariantPreference;
  allowedPreferences: DeckCardVariantPreference[];
  quantity: number;
  collectionEntries?: { variant: CardVariant; quantity: number }[];
};

export type DeckAllocationRow = DeckDetailCardDisplay & {
  allocationId: string;
  variant: CardVariant;
  quantity: number;
};

export type DeckMissingSummary = {
  requirementLineCount: number;
  completeLineCount: number;
  missingLineCount: number;
  requiredCardQuantity: number;
  satisfiedCardQuantity: number;
  missingCardQuantity: number;
  isComplete: boolean;
};

export type DeckMissingRow = DeckDetailCardDisplay & {
  preferredVariant: DeckCardVariantPreference;
  requiredQuantity: number;
  satisfiedQuantity: number;
  missingQuantity: number;
  usedVariants: Array<{ variant: CardVariant; quantity: number }>;
};

export type DeckMissingDetail = {
  summary: DeckMissingSummary;
  rows: DeckMissingRow[];
};

export type DeckDetailSummary = {
  requirementLineCount: number;
  requiredCardQuantity: number;
  allocationLineCount: number;
  allocatedCardQuantity: number;
};

export type DeckRequirementCardOption = DeckDetailCardDisplay & {
  allowedPreferences: DeckCardVariantPreference[];
};

export type DeckDetailPageData = {
  deckId: string;
  name: string;
  description: string | null;
  status: DeckStatus;
  allocationStrategy: DeckAllocationStrategy;
  createdAt: string;
  updatedAt: string;
  requirements: DeckRequirementRow[];
  allocations: DeckAllocationRow[];
  missing: DeckMissingDetail;
  summary: DeckDetailSummary;
  cardOptions: DeckRequirementCardOption[];
};

const deckDetailCardSelect = {
  id: true,
  name: true,
  collectorNumber: true,
  rarity: true,
  kind: true,
  printTreatment: true,
  hasShowcase: true,
  set: { select: { code: true, name: true } },
  translations: { orderBy: { locale: "asc" }, select: { locale: true, name: true } },
} as const;

const deckDetailCardWithCollectionSelect = {
  ...deckDetailCardSelect,
  collectionEntries: { select: { variant: true, quantity: true } },
} as const;

function getAllowedDeckCardPreferences(card: Pick<DeckDetailCardRecord, "rarity" | "kind" | "hasShowcase">): DeckCardVariantPreference[] {
  return ["ANY", ...getAllowedVariants(card)] as DeckCardVariantPreference[];
}

function mapDeckDetailCard(card: DeckDetailCardRecord): DeckDetailCardDisplay {
  return {
    cardId: card.id,
    displayName: getDisplayCardName(card),
    officialName: card.name,
    collectorNumber: card.collectorNumber ?? "—",
    rarity: card.rarity,
    kind: card.kind,
    printTreatment: card.printTreatment,
    hasShowcase: card.hasShowcase,
    set: card.set,
  };
}

function compareDeckDetailCardRows(
  left: DeckDetailCardDisplay,
  right: DeckDetailCardDisplay,
): number {
  return left.set.code.localeCompare(right.set.code, "fr")
    || left.collectorNumber.localeCompare(right.collectorNumber, "fr", { numeric: true })
    || left.displayName.localeCompare(right.displayName, "fr");
}

export function createDeckRequirementCardOptions(cards: DeckDetailCardRecord[]): DeckRequirementCardOption[] {
  return cards
    .map((card) => ({
      ...mapDeckDetailCard(card),
      allowedPreferences: getAllowedDeckCardPreferences(card),
    }))
    .sort(compareDeckDetailCardRows);
}
function variantCountsToUsedRows(usedVariants: VariantCounts): Array<{ variant: CardVariant; quantity: number }> {
  return (["NORMAL", "FOIL", "SHOWCASE"] as const)
    .map((variant) => ({ variant, quantity: getVariantCount(usedVariants, variant) }))
    .filter((row) => row.quantity > 0);
}

function createDeckAvailabilityInputs(
  requirements: DeckRequirementRow[],
  deckAllocationSets: DeckAllocationSet[] = [],
) {
  const requirementByCardId = new Map(requirements.map((requirement) => [requirement.cardId, requirement]));

  return [...requirementByCardId.values()].map((requirement) => {
    const card = { id: requirement.cardId, kind: requirement.kind, rarity: requirement.rarity, hasShowcase: requirement.hasShowcase };
    const allowedVariants = getAllowedVariants(card);
    const ownedCounts = createOwnedVariantCounts(
      requirement.cardId,
      allowedVariants,
      requirement.collectionEntries ?? [],
    );
    const binderReserved = getBinderReservation(card, ownedCounts).reserved;

    return getCardAvailability(card, ownedCounts, deckAllocationSets, binderReserved);
  });
}

export function createDeckMissingDetail(
  requirements: DeckRequirementRow[],
  deckAllocationSets: DeckAllocationSet[] = [],
): DeckMissingDetail {
  const missingResults = calculateDeckMissingCards(
    requirements.map((requirement) => ({
      cardId: requirement.cardId,
      quantity: requirement.quantity,
      preferredVariant: requirement.preferredVariant,
    })),
    createDeckAvailabilityInputs(requirements, deckAllocationSets),
  );
  const requirementByKey = new Map(
    requirements.map((requirement) => [`${requirement.cardId}::${requirement.preferredVariant}`, requirement]),
  );
  const rows = missingResults.map((result) => {
    const requirement = requirementByKey.get(`${result.cardId}::${result.preferredVariant}`);
    if (!requirement) {
      throw new Error(`Missing deck requirement display data for ${result.cardId}`);
    }

    return {
      ...requirement,
      requiredQuantity: result.requiredQuantity,
      satisfiedQuantity: result.satisfiedQuantity,
      missingQuantity: result.missingQuantity,
      usedVariants: variantCountsToUsedRows(result.usedVariants),
    };
  });

  const summary = rows.reduce<DeckMissingSummary>((acc, row) => ({
    requirementLineCount: acc.requirementLineCount + 1,
    completeLineCount: acc.completeLineCount + (row.missingQuantity === 0 ? 1 : 0),
    missingLineCount: acc.missingLineCount + (row.missingQuantity > 0 ? 1 : 0),
    requiredCardQuantity: acc.requiredCardQuantity + row.requiredQuantity,
    satisfiedCardQuantity: acc.satisfiedCardQuantity + row.satisfiedQuantity,
    missingCardQuantity: acc.missingCardQuantity + row.missingQuantity,
    isComplete: false,
  }), {
    requirementLineCount: 0,
    completeLineCount: 0,
    missingLineCount: 0,
    requiredCardQuantity: 0,
    satisfiedCardQuantity: 0,
    missingCardQuantity: 0,
    isComplete: true,
  });

  return { summary: { ...summary, isComplete: summary.missingCardQuantity === 0 }, rows };
}

export function createDeckDetailPageData(deck: DeckDetailRecord, cardOptions: DeckRequirementCardOption[] = [], deckAllocationSets: DeckAllocationSet[] = []): DeckDetailPageData {
  const requirements = deck.deckCards
    .map((row) => ({
      deckCardId: row.id,
      ...mapDeckDetailCard(row.card),
      preferredVariant: row.preferredVariant,
      allowedPreferences: getAllowedDeckCardPreferences(row.card),
      quantity: row.quantity,
      collectionEntries: row.card.collectionEntries,
    }))
    .sort((left, right) => compareDeckDetailCardRows(left, right)
      || left.preferredVariant.localeCompare(right.preferredVariant, "fr"));

  const allocations = deck.allocations
    .map((row) => ({
      allocationId: row.id,
      ...mapDeckDetailCard(row.card),
      variant: row.variant,
      quantity: row.quantity,
    }))
    .sort((left, right) => compareDeckDetailCardRows(left, right)
      || left.variant.localeCompare(right.variant, "fr"));


  const missing = createDeckMissingDetail(requirements, deckAllocationSets);

  return {
    deckId: deck.id,
    name: deck.name,
    description: deck.description,
    status: deck.status,
    allocationStrategy: deck.allocationStrategy,
    createdAt: deck.createdAt.toISOString(),
    updatedAt: deck.updatedAt.toISOString(),
    requirements,
    allocations,
    missing,
    summary: {
      requirementLineCount: requirements.length,
      requiredCardQuantity: requirements.reduce((total, row) => total + row.quantity, 0),
      allocationLineCount: allocations.length,
      allocatedCardQuantity: allocations.reduce((total, row) => total + row.quantity, 0),
    },
    cardOptions,
  };
}

export async function getDeckDetailPageData(deckId: string): Promise<DeckDetailPageData | null> {
  const deck = await prisma.deck.findUnique({
    where: { id: deckId },
    select: {
      id: true,
      name: true,
      description: true,
      status: true,
      allocationStrategy: true,
      createdAt: true,
      updatedAt: true,
      deckCards: {
        select: {
          id: true,
          cardId: true,
          quantity: true,
          preferredVariant: true,
          card: { select: deckDetailCardWithCollectionSelect },
        },
      },
      allocations: {
        select: {
          id: true,
          cardId: true,
          variant: true,
          quantity: true,
          card: { select: deckDetailCardSelect },
        },
      },
    },
  });

  if (!deck) {
    return null;
  }

  const [cards, assembledDecks] = await Promise.all([
    prisma.card.findMany({
      where: { kind: { in: ["GAMEPLAY", "ENERGY"] } },
      select: deckDetailCardSelect,
    }),
    prisma.deck.findMany({
      where: { status: "ASSEMBLED" },
      select: { allocations: { select: { cardId: true, variant: true, quantity: true } } },
    }),
  ]);

  return createDeckDetailPageData(
    deck,
    createDeckRequirementCardOptions(cards),
    assembledDecks.map((assembledDeck) => ({ assembled: true, allocations: assembledDeck.allocations })),
  );
}
