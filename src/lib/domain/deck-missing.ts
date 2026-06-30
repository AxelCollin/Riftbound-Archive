import type { VariantCounts } from "./variants";
import { getVariantCount } from "./variants";
import type { DeckCardVariantPreference, DeckRequirementInput } from "./decks";
import { normalizeDeckRequirements } from "./decks";

export type DeckCardAvailabilityInput = {
  cardId: string;
  available: VariantCounts;
};

export type DeckMissingResultRow = {
  cardId: string;
  preferredVariant: DeckCardVariantPreference;
  requiredQuantity: number;
  satisfiedQuantity: number;
  missingQuantity: number;
  usedVariants: VariantCounts;
};

const exactVariantPreferences = ["NORMAL", "FOIL", "SHOWCASE"] as const;
const preservePremiumVariantOrder = ["NORMAL", "FOIL", "SHOWCASE"] as const;

export function calculateDeckMissingCards(
  requirements: DeckRequirementInput[],
  availabilityByCard: DeckCardAvailabilityInput[],
): DeckMissingResultRow[] {
  const normalizedRequirements = normalizeDeckRequirements(requirements);
  const remainingAvailabilityByCard =
    createRemainingAvailabilityByCard(availabilityByCard);
  const resultRowsByKey = new Map<string, DeckMissingResultRow>();

  for (const requirement of sortRequirementsForAllocation(
    normalizedRequirements,
  )) {
    const remainingAvailability =
      remainingAvailabilityByCard.get(requirement.cardId) ?? {};
    const usedVariants = planDeckRequirementVariantUsage(
      requirement,
      remainingAvailability,
    );
    decrementRemainingAvailability(remainingAvailability, usedVariants);

    const satisfiedQuantity = sumVariantCounts(usedVariants);
    const resultRow: DeckMissingResultRow = {
      cardId: requirement.cardId,
      preferredVariant: requirement.preferredVariant,
      requiredQuantity: requirement.quantity,
      satisfiedQuantity,
      missingQuantity: Math.max(0, requirement.quantity - satisfiedQuantity),
      usedVariants,
    };

    resultRowsByKey.set(getResultRowKey(requirement), resultRow);
  }

  return normalizedRequirements.map(
    (requirement) => resultRowsByKey.get(getResultRowKey(requirement))!,
  );
}

export function planDeckRequirementVariantUsage(
  requirement: DeckRequirementInput,
  available: VariantCounts,
): VariantCounts {
  const usedVariants: VariantCounts = {};
  let remainingQuantity = requirement.quantity;
  const variantsToUse =
    requirement.preferredVariant === "ANY"
      ? preservePremiumVariantOrder
      : [requirement.preferredVariant];

  for (const variant of variantsToUse) {
    const usedQuantity = Math.min(
      remainingQuantity,
      getVariantCount(available, variant),
    );

    if (usedQuantity > 0) {
      usedVariants[variant] = usedQuantity;
      remainingQuantity -= usedQuantity;
    }

    if (remainingQuantity === 0) {
      break;
    }
  }

  return usedVariants;
}

function createRemainingAvailabilityByCard(
  availabilityByCard: DeckCardAvailabilityInput[],
): Map<string, VariantCounts> {
  return new Map(
    availabilityByCard.map(({ cardId, available }) => [
      cardId,
      {
        NORMAL: getVariantCount(available, "NORMAL"),
        FOIL: getVariantCount(available, "FOIL"),
        SHOWCASE: getVariantCount(available, "SHOWCASE"),
      },
    ]),
  );
}

function sortRequirementsForAllocation(
  requirements: DeckRequirementInput[],
): DeckRequirementInput[] {
  return requirements
    .map((requirement, index) => ({ requirement, index }))
    .sort((left, right) => {
      const cardComparison = left.requirement.cardId.localeCompare(
        right.requirement.cardId,
      );

      if (cardComparison !== 0) {
        return cardComparison;
      }

      const leftRank =
        left.requirement.preferredVariant === "ANY"
          ? exactVariantPreferences.length
          : exactVariantPreferences.indexOf(left.requirement.preferredVariant);
      const rightRank =
        right.requirement.preferredVariant === "ANY"
          ? exactVariantPreferences.length
          : exactVariantPreferences.indexOf(right.requirement.preferredVariant);

      if (leftRank !== rightRank) {
        return leftRank - rightRank;
      }

      return left.index - right.index;
    })
    .map(({ requirement }) => requirement);
}

function decrementRemainingAvailability(
  remainingAvailability: VariantCounts,
  usedVariants: VariantCounts,
): void {
  for (const variant of preservePremiumVariantOrder) {
    const usedQuantity = getVariantCount(usedVariants, variant);

    if (usedQuantity > 0) {
      remainingAvailability[variant] =
        getVariantCount(remainingAvailability, variant) - usedQuantity;
    }
  }
}

function sumVariantCounts(counts: VariantCounts): number {
  return preservePremiumVariantOrder.reduce(
    (total, variant) => total + getVariantCount(counts, variant),
    0,
  );
}

function getResultRowKey(requirement: DeckRequirementInput): string {
  return `${requirement.cardId}::${requirement.preferredVariant}`;
}
