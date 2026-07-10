import type { CardLanguage } from "./card-languages";
import type { RiftboundCard } from "./cards";
import { isTrackableCard } from "./cards";
import { getBinderReservation } from "./binder";
import type { PhysicalFinish } from "./physical-finishes";
import { mapLegacyCardVariantToPhysicalFinish } from "./physical-finishes";
import type { CardVariant, VariantCounts } from "./variants";
import { getAllowedVariants, getVariantCount } from "./variants";

export interface DeckVariantAllocation {
  cardId: string;
  variant: CardVariant;
  physicalFinish?: PhysicalFinish | null;
  cardLanguage?: CardLanguage;
  quantity: number;
}

export interface DeckAllocationSet {
  assembled: boolean;
  allocations: DeckVariantAllocation[];
}

export interface CardAvailability {
  cardId: string;
  available: VariantCounts;
}

/**
 * Returns the app-facing available count.
 *
 * The raw conceptual formula is:
 *
 * available = owned - binderReserved - assembledDeckAllocated
 *
 * This helper clamps negative raw results to 0 for UI-safe display. Future
 * diagnostic/explanation logic should report over-reservation or over-allocation
 * separately instead of inferring data validity from this clamped value.
 */
export function getAvailableCount(owned: number, binderReserved: number, assembledDeckAllocated: number): number {
  return Math.max(0, owned - binderReserved - assembledDeckAllocated);
}

export function getAssembledDeckAllocatedCount(
  cardId: string,
  variant: CardVariant,
  deckAllocationSets: DeckAllocationSet[] = [],
): number {
  return deckAllocationSets
    .filter((deckAllocationSet) => deckAllocationSet.assembled)
    .flatMap((deckAllocationSet) => deckAllocationSet.allocations)
    .filter((allocation) => allocation.cardId === cardId && getDeckAllocationQuantityVariant(allocation) === variant)
    .reduce((total, allocation) => total + Math.max(0, allocation.quantity), 0);
}

export function getDeckAllocationQuantityVariant(
  allocation: Pick<DeckVariantAllocation, "variant" | "physicalFinish">,
): CardVariant | null {
  if (allocation.physicalFinish) {
    return allocation.physicalFinish;
  }

  return mapLegacyCardVariantToPhysicalFinish(allocation.variant) ?? (allocation.variant === "SHOWCASE" ? "SHOWCASE" : null);
}

export function getCardAvailability(
  card: Pick<RiftboundCard, "id" | "kind" | "gameplayType" | "collectorCategory" | "rarity" | "hasShowcase">,
  owned: VariantCounts,
  deckAllocationSets: DeckAllocationSet[] = [],
  binderReserved: VariantCounts = getBinderReservation(card, owned).reserved,
): CardAvailability {
  const available: VariantCounts = {};

  if (!isTrackableCard(card)) {
    return { cardId: card.id, available };
  }

  for (const variant of getAllowedVariants(card)) {
    const count = getAvailableCount(
      getVariantCount(owned, variant),
      getVariantCount(binderReserved, variant),
      getAssembledDeckAllocatedCount(card.id, variant, deckAllocationSets),
    );

    if (count > 0) {
      available[variant] = count;
    }
  }

  return { cardId: card.id, available };
}
