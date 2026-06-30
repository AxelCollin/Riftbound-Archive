import type { DeckAllocationStrategy, DeckStatus } from "@prisma/client";

export const deckStatusLabelsFr: Record<DeckStatus, string> = {
  THEORETICAL: "Théorique",
  ASSEMBLED: "Assemblé",
  ARCHIVED: "Archivé",
};

export const deckAllocationStrategyLabelsFr: Record<DeckAllocationStrategy, string> = {
  PRESERVE_PREMIUM_VARIANTS: "Préserver les variantes premium",
  EXACT_VARIANT: "Variante exacte",
  ANY_VARIANT: "Toute variante",
};
