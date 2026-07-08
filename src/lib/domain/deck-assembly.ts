import { isTrackableCard, type RiftboundCard } from "./cards";
import type { DeckCardVariantPreference, DeckRequirementInput } from "./decks";
import { normalizeDeckRequirements } from "./decks";
import { mapLegacyCardVariantToPhysicalFinish, type PhysicalFinish } from "./physical-finishes";
import { getAllowedVariants, getVariantCount, type CardVariant, type VariantCounts } from "./variants";

export type DeckAssemblyCard = Pick<RiftboundCard, "id" | "kind" | "gameplayType" | "collectorCategory" | "rarity" | "hasShowcase">;

export type DeckAssemblyAvailabilityInput = {
  cardId: string;
  available: VariantCounts;
};

export type DeckCardAllocationPlanRow = {
  cardId: string;
  variant: CardVariant;
  physicalFinish: PhysicalFinish | null;
  quantity: number;
};

export type DeckAssemblyResult =
  | { ok: true; allocations: DeckCardAllocationPlanRow[] }
  | { ok: false; error: string; allocations: [] };

const exactVariantPreferences = ["NORMAL", "FOIL", "SHOWCASE"] as const;

export function planAssembledDeckAllocations(
  requirements: DeckRequirementInput[],
  availabilityByCard: DeckAssemblyAvailabilityInput[],
  cards: DeckAssemblyCard[],
): DeckAssemblyResult {
  const normalizedRequirements = normalizeDeckRequirements(requirements);
  const cardById = new Map(cards.map((card) => [card.id, card]));
  const remainingAvailabilityByCard = createRemainingAvailabilityByCard(availabilityByCard);
  const allocationCountsByKey = new Map<string, DeckCardAllocationPlanRow>();

  for (const requirement of sortRequirementsForAllocation(normalizedRequirements)) {
    const card = cardById.get(requirement.cardId);

    if (!card || !isTrackableCard(card)) {
      return fail(`Card ${requirement.cardId} is not trackable for deck allocation.`);
    }

    const variantsToUse = getAllocationVariantOrder(card, requirement.preferredVariant);

    if (variantsToUse.length === 0) {
      return fail(`Requirement ${requirement.cardId} cannot be allocated with variant ${requirement.preferredVariant}.`);
    }

    const remainingAvailability = remainingAvailabilityByCard.get(requirement.cardId) ?? {};
    let remainingRequiredQuantity = requirement.quantity;

    for (const variant of variantsToUse) {
      const usedQuantity = Math.min(remainingRequiredQuantity, getVariantCount(remainingAvailability, variant));

      if (usedQuantity > 0) {
        addAllocation(allocationCountsByKey, requirement.cardId, variant, usedQuantity);
        remainingAvailability[variant] = getVariantCount(remainingAvailability, variant) - usedQuantity;
        remainingRequiredQuantity -= usedQuantity;
      }

      if (remainingRequiredQuantity === 0) {
        break;
      }
    }

    if (remainingRequiredQuantity > 0) {
      return fail(`Insufficient availability for card ${requirement.cardId}: missing ${remainingRequiredQuantity} copy/copies.`);
    }
  }

  return { ok: true, allocations: Array.from(allocationCountsByKey.values()) };
}

function getAllocationVariantOrder(card: DeckAssemblyCard, preferredVariant: DeckCardVariantPreference): CardVariant[] {
  const allowedVariants = getAllowedVariants(card);

  if (preferredVariant !== "ANY") {
    return allowedVariants.includes(preferredVariant) ? [preferredVariant] : [];
  }

  const preservePremiumOrder: CardVariant[] = allowedVariants.includes("NORMAL")
    ? ["NORMAL", "FOIL", "SHOWCASE"]
    : ["FOIL", "SHOWCASE"];

  return preservePremiumOrder.filter((variant) => allowedVariants.includes(variant));
}

function createRemainingAvailabilityByCard(availabilityByCard: DeckAssemblyAvailabilityInput[]): Map<string, VariantCounts> {
  return new Map(availabilityByCard.map(({ cardId, available }) => [cardId, {
    NORMAL: getVariantCount(available, "NORMAL"),
    FOIL: getVariantCount(available, "FOIL"),
    SHOWCASE: getVariantCount(available, "SHOWCASE"),
  }]));
}

function sortRequirementsForAllocation(requirements: DeckRequirementInput[]): DeckRequirementInput[] {
  return requirements
    .map((requirement, index) => ({ requirement, index }))
    .sort((left, right) => left.requirement.cardId.localeCompare(right.requirement.cardId)
      || getPreferenceRank(left.requirement.preferredVariant) - getPreferenceRank(right.requirement.preferredVariant)
      || left.index - right.index)
    .map(({ requirement }) => requirement);
}

function getPreferenceRank(preferredVariant: DeckCardVariantPreference): number {
  return preferredVariant === "ANY" ? exactVariantPreferences.length : exactVariantPreferences.indexOf(preferredVariant);
}

function addAllocation(allocations: Map<string, DeckCardAllocationPlanRow>, cardId: string, variant: CardVariant, quantity: number): void {
  const key = `${cardId}::${variant}`;
  const existing = allocations.get(key);

  if (existing) {
    existing.quantity += quantity;
  } else {
    allocations.set(key, { cardId, variant, physicalFinish: mapLegacyCardVariantToPhysicalFinish(variant), quantity });
  }
}

function fail(error: string): DeckAssemblyResult {
  return { ok: false, error, allocations: [] };
}
