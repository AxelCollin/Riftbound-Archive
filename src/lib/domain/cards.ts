import type { CardGameplayType } from "./card-taxonomy";

export const CARD_RARITIES = ["COMMON", "UNCOMMON", "RARE", "EPIC", "ULTIMATE", "UNKNOWN"] as const;
export type CardRarity = (typeof CARD_RARITIES)[number];

export const CARD_KINDS = ["GAMEPLAY", "ENERGY", "TOKEN", "RULES"] as const;
export type CardKind = (typeof CARD_KINDS)[number];

export interface RiftboundCard {
  id: string;
  name: string;
  rarity: CardRarity;
  kind: CardKind;
  gameplayType?: CardGameplayType | null;
  hasShowcase?: boolean;
}

const ignoredCardKinds = new Set<CardKind>(["TOKEN", "RULES"]);
const ignoredGameplayTypes = new Set<CardGameplayType>(["TOKEN", "RULES"]);

export function isTrackableCard(card: Pick<RiftboundCard, "kind" | "gameplayType">): boolean {
  if (card.gameplayType && card.gameplayType !== "UNKNOWN") {
    return !ignoredGameplayTypes.has(card.gameplayType);
  }

  return !ignoredCardKinds.has(card.kind);
}
