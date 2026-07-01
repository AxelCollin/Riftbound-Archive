import type { DeckCardVariantPreference } from "./decks";
import { DECK_CARD_VARIANT_PREFERENCES } from "./decks";

export type DeckRequirementWriteInput = {
  cardId: string;
  quantity: number;
  preferredVariant: DeckCardVariantPreference;
};

const deckCardVariantPreferences = new Set<string>(DECK_CARD_VARIANT_PREFERENCES);

export function normalizeDeckRequirementWriteInput(
  input: DeckRequirementWriteInput,
): DeckRequirementWriteInput {
  const cardId = String(input.cardId ?? "").trim();

  if (cardId.length === 0) {
    throw new Error("Deck requirement cardId is required.");
  }

  if (!Number.isInteger(input.quantity) || input.quantity <= 0) {
    throw new Error("Deck requirement quantity must be a positive integer.");
  }

  if (!deckCardVariantPreferences.has(input.preferredVariant)) {
    throw new Error("Deck requirement preferredVariant must be one of ANY, NORMAL, FOIL, or SHOWCASE.");
  }

  return {
    cardId,
    quantity: input.quantity,
    preferredVariant: input.preferredVariant,
  };
}
