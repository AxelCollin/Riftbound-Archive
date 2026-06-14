export const CARD_RARITIES = ["COMMON", "UNCOMMON", "RARE", "EPIC", "LEGENDARY", "SECRET"] as const;
export type CardRarity = (typeof CARD_RARITIES)[number];

export const CARD_KINDS = ["GAMEPLAY", "ENERGY", "TOKEN", "RULES"] as const;
export type CardKind = (typeof CARD_KINDS)[number];

export interface RiftboundCard {
  id: string;
  name: string;
  rarity: CardRarity;
  kind: CardKind;
  hasShowcase?: boolean;
}

const ignoredCardKinds = new Set<CardKind>(["TOKEN", "RULES"]);

export function isTrackableCard(card: Pick<RiftboundCard, "kind">): boolean {
  return !ignoredCardKinds.has(card.kind);
}
