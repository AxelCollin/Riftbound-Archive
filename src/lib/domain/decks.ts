export const DECK_CARD_VARIANT_PREFERENCES = [
  "ANY",
  "NORMAL",
  "FOIL",
  "SHOWCASE",
] as const;

export type DeckCardVariantPreference =
  (typeof DECK_CARD_VARIANT_PREFERENCES)[number];

export type DeckRequirementInput = {
  cardId: string;
  quantity: number;
  preferredVariant: DeckCardVariantPreference;
};

const deckCardVariantPreferences = new Set<string>(
  DECK_CARD_VARIANT_PREFERENCES,
);

export function getDeckRequirementKey(
  requirement: Pick<DeckRequirementInput, "cardId" | "preferredVariant">,
): string {
  return `${requirement.cardId}::${requirement.preferredVariant}`;
}

export function normalizeDeckRequirements(
  requirements: DeckRequirementInput[],
): DeckRequirementInput[] {
  const mergedRequirements = new Map<string, DeckRequirementInput>();

  for (const requirement of requirements) {
    const cardId = validateDeckRequirementCardId(requirement.cardId);
    const quantity = validateDeckRequirementQuantity(
      requirement.quantity,
      cardId,
    );
    const preferredVariant = validateDeckRequirementPreferredVariant(
      requirement.preferredVariant,
      cardId,
    );
    const key = getDeckRequirementKey({ cardId, preferredVariant });
    const existingRequirement = mergedRequirements.get(key);

    if (existingRequirement) {
      existingRequirement.quantity += quantity;
    } else {
      mergedRequirements.set(key, { cardId, quantity, preferredVariant });
    }
  }

  return Array.from(mergedRequirements.values());
}

function validateDeckRequirementCardId(cardId: string): string {
  const normalizedCardId = cardId.trim();

  if (normalizedCardId.length === 0) {
    throw new Error("Deck requirement cardId must not be empty.");
  }

  return normalizedCardId;
}

function validateDeckRequirementQuantity(
  quantity: number,
  cardId: string,
): number {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error(
      `Deck requirement quantity for card ${cardId} must be a positive integer.`,
    );
  }

  return quantity;
}

function validateDeckRequirementPreferredVariant(
  preferredVariant: DeckCardVariantPreference,
  cardId: string,
): DeckCardVariantPreference {
  if (!deckCardVariantPreferences.has(preferredVariant)) {
    throw new Error(
      `Deck requirement preferredVariant for card ${cardId} must be one of ANY, NORMAL, FOIL, or SHOWCASE.`,
    );
  }

  return preferredVariant;
}
