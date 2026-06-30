import { prisma } from "../db";
import {
  getAssembledDeckAllocatedCount,
  getCardAvailability,
  type DeckAllocationSet,
} from "../domain/availability";
import { getBinderReservation } from "../domain/binder";
import { isTrackableCard, type CardKind, type CardRarity } from "../domain/cards";
import {
  assertOwnedSnapshotVariantsAllowed,
  normalizeOwnedSnapshotQuantity,
} from "../domain/collection-quantities";
import {
  getAllowedVariants,
  getVariantCount,
  type CardVariant,
  type VariantCounts,
} from "../domain/variants";
import { getFirstCardDetailLookupResult } from "./card-detail-route";
import { getDisplayCardName } from "./collection";

type AvailabilityTranslationRecord = {
  locale: string;
  name: string;
};

type AvailabilityCollectionEntryRecord = {
  variant: CardVariant;
  quantity: number;
};

export type CardAvailabilityRecord = {
  id: string;
  name: string;
  collectorNumber: string | null;
  rarity: CardRarity;
  kind: CardKind;
  hasShowcase: boolean;
  set: {
    code: string;
    name: string;
  };
  translations: AvailabilityTranslationRecord[];
  collectionEntries: AvailabilityCollectionEntryRecord[];
};

export type CardAvailabilityDeckAllocationBreakdown = {
  deckName: string;
  variant: CardVariant;
  allocatedQuantity: number;
};

export type CardAvailabilityExplanationRow = {
  variant: CardVariant;
  ownedQuantity: number;
  binderReservedQuantity: number;
  assembledDeckAllocatedQuantity: number;
  availableQuantity: number;
  rawAvailableQuantity: number;
  status: "AVAILABLE" | "UNAVAILABLE";
  reasons: Array<
    | "NO_OWNED_COPIES"
    | "BINDER_RESERVED_COPIES"
    | "ASSEMBLED_DECK_ALLOCATED_COPIES"
    | "AVAILABLE_AFTER_RESERVATIONS"
    | "APP_VALUE_CLAMPED_TO_ZERO"
  >;
  deckAllocations: CardAvailabilityDeckAllocationBreakdown[];
};

export type CardAvailabilityExplanation = {
  cardId: string;
  displayName: string;
  collectorNumber: string;
  set: {
    code: string;
    name: string;
  };
  isTrackable: boolean;
  rows: CardAvailabilityExplanationRow[];
  deckAllocations: CardAvailabilityDeckAllocationBreakdown[];
};

type NamedDeckAllocationSet = DeckAllocationSet & {
  deckName: string;
};

export function createCardAvailabilityExplanation(
  record: CardAvailabilityRecord,
  deckAllocationSets: NamedDeckAllocationSet[] = [],
): CardAvailabilityExplanation {
  const allowedVariants = getAllowedVariants(record);
  assertOwnedSnapshotVariantsAllowed(record.id, record.collectionEntries, allowedVariants);

  const ownedCounts = createOwnedVariantCounts(record.id, allowedVariants, record.collectionEntries);
  const binderReserved = getBinderReservation(record, ownedCounts).reserved;
  const appFacingAvailable = getCardAvailability(record, ownedCounts, deckAllocationSets, binderReserved).available;

  const rows = allowedVariants.map((variant) => {
    const ownedQuantity = getVariantCount(ownedCounts, variant);
    const binderReservedQuantity = getVariantCount(binderReserved, variant);
    const assembledDeckAllocatedQuantity = getAssembledDeckAllocatedCount(record.id, variant, deckAllocationSets);
    const availableQuantity = getVariantCount(appFacingAvailable, variant);
    const rawAvailableQuantity = ownedQuantity - binderReservedQuantity - assembledDeckAllocatedQuantity;
    const deckAllocations = getDeckAllocationBreakdown(record.id, variant, deckAllocationSets);
    const reasons: CardAvailabilityExplanationRow["reasons"] = [];

    if (ownedQuantity === 0) {
      reasons.push("NO_OWNED_COPIES");
    }

    if (binderReservedQuantity > 0) {
      reasons.push("BINDER_RESERVED_COPIES");
    }

    if (assembledDeckAllocatedQuantity > 0) {
      reasons.push("ASSEMBLED_DECK_ALLOCATED_COPIES");
    }

    if (availableQuantity > 0) {
      reasons.push("AVAILABLE_AFTER_RESERVATIONS");
    }

    if (rawAvailableQuantity < 0 && availableQuantity === 0) {
      reasons.push("APP_VALUE_CLAMPED_TO_ZERO");
    }

    return {
      variant,
      ownedQuantity,
      binderReservedQuantity,
      assembledDeckAllocatedQuantity,
      availableQuantity,
      rawAvailableQuantity,
      status: availableQuantity > 0 ? "AVAILABLE" as const : "UNAVAILABLE" as const,
      reasons,
      deckAllocations,
    };
  });

  return {
    cardId: record.id,
    displayName: getDisplayCardName(record),
    collectorNumber: record.collectorNumber ?? "—",
    set: record.set,
    isTrackable: isTrackableCard(record),
    rows,
    deckAllocations: rows.flatMap((row) => row.deckAllocations),
  };
}

function createOwnedVariantCounts(
  cardId: string,
  allowedVariants: CardVariant[],
  collectionEntries: AvailabilityCollectionEntryRecord[],
): VariantCounts {
  const entriesByVariant = new Map(collectionEntries.map((entry) => [entry.variant, entry.quantity]));
  const ownedCounts: VariantCounts = {};

  for (const variant of allowedVariants) {
    const ownedQuantity = normalizeOwnedSnapshotQuantity({
      cardId,
      variant,
      quantity: entriesByVariant.get(variant) ?? 0,
    });

    if (ownedQuantity > 0) {
      ownedCounts[variant] = ownedQuantity;
    }
  }

  return ownedCounts;
}

function getDeckAllocationBreakdown(
  cardId: string,
  variant: CardVariant,
  deckAllocationSets: NamedDeckAllocationSet[],
): CardAvailabilityDeckAllocationBreakdown[] {
  return deckAllocationSets
    .filter((deckAllocationSet) => deckAllocationSet.assembled)
    .flatMap((deckAllocationSet) =>
      deckAllocationSet.allocations
        .filter((allocation) => allocation.cardId === cardId && allocation.variant === variant && allocation.quantity > 0)
        .map((allocation) => ({
          deckName: deckAllocationSet.deckName,
          variant: allocation.variant,
          allocatedQuantity: allocation.quantity,
        })),
    );
}

export async function getCardAvailabilityExplanation(
  cardId: string,
): Promise<CardAvailabilityExplanation | null> {
  const [card, deckAllocationSets] = await Promise.all([
    prisma.card.findUnique({
      where: { id: cardId },
      include: {
        set: { select: { code: true, name: true } },
        translations: { orderBy: { locale: "asc" }, select: { locale: true, name: true } },
        collectionEntries: { select: { variant: true, quantity: true } },
      },
    }),
    getDeckAllocationSetsForCard(cardId),
  ]);

  return card ? createCardAvailabilityExplanation(card, deckAllocationSets) : null;
}

export async function getCardAvailabilityExplanationFromRouteParam(
  routeCardId: string,
): Promise<CardAvailabilityExplanation | null> {
  return getFirstCardDetailLookupResult(routeCardId, getCardAvailabilityExplanation);
}

async function getDeckAllocationSetsForCard(cardId: string): Promise<NamedDeckAllocationSet[]> {
  const decks = await prisma.deck.findMany({
    where: { allocations: { some: { cardId } } },
    select: {
      name: true,
      status: true,
      allocations: {
        where: { cardId },
        select: { cardId: true, variant: true, quantity: true },
      },
    },
  });

  return decks.map((deck) => ({
    deckName: deck.name,
    assembled: deck.status === "ASSEMBLED",
    allocations: deck.allocations,
  }));
}
