import type { DeckAllocationStrategy } from "@prisma/client";

export type DeckMetadataInput = {
  name: string;
  description?: string | null;
  allocationStrategy?: DeckAllocationStrategy;
};

export type NormalizedDeckMetadataInput = {
  name: string;
  description: string | null;
  allocationStrategy: DeckAllocationStrategy;
};

export const DEFAULT_DECK_ALLOCATION_STRATEGY: DeckAllocationStrategy = "PRESERVE_PREMIUM_VARIANTS";
export const DECK_NAME_MAX_LENGTH = 120;

const deckAllocationStrategies = new Set<DeckAllocationStrategy>([
  "PRESERVE_PREMIUM_VARIANTS",
  "EXACT_VARIANT",
  "ANY_VARIANT",
]);

export function normalizeDeckMetadataInput(input: DeckMetadataInput): NormalizedDeckMetadataInput {
  const name = input.name.trim();

  if (name.length === 0) {
    throw new Error("Deck name is required.");
  }

  if (name.length > DECK_NAME_MAX_LENGTH) {
    throw new Error(`Deck name must be ${DECK_NAME_MAX_LENGTH} characters or fewer.`);
  }

  const allocationStrategy = input.allocationStrategy ?? DEFAULT_DECK_ALLOCATION_STRATEGY;

  if (!deckAllocationStrategies.has(allocationStrategy)) {
    throw new Error("Deck allocation strategy must be one of PRESERVE_PREMIUM_VARIANTS, EXACT_VARIANT, or ANY_VARIANT.");
  }

  const description = input.description?.trim() ?? "";

  return {
    name,
    description: description.length > 0 ? description : null,
    allocationStrategy,
  };
}
