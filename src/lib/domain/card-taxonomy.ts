import type { CardKind } from "./cards";

export const CARD_GAMEPLAY_TYPES = ["UNIT", "CHAMPION", "TERRAIN", "LEGEND", "SPELL", "RUNE", "TOKEN", "RULES", "UNKNOWN"] as const;
export type CardGameplayType = (typeof CARD_GAMEPLAY_TYPES)[number];

export const CARD_GAMEPLAY_RARITIES = ["COMMON", "UNCOMMON", "RARE", "EPIC", "UNKNOWN"] as const;
export type CardGameplayRarity = (typeof CARD_GAMEPLAY_RARITIES)[number];

export const CARD_COLLECTOR_CATEGORIES = ["STANDARD", "SHOWCASE", "UNKNOWN"] as const;
export type CardCollectorCategory = (typeof CARD_COLLECTOR_CATEGORIES)[number];

export const SHOWCASE_TREATMENTS = ["ALTERNATIVE", "OVERNUMBER", "SIGNED", "ULTIMATE", "UNKNOWN"] as const;
export type ShowcaseTreatment = (typeof SHOWCASE_TREATMENTS)[number];

export const CARD_FACTIONS = ["FURY", "CALM", "MIND", "BODY", "CHAOS", "ORDER"] as const;
export type CardFaction = (typeof CARD_FACTIONS)[number];

export const PHYSICAL_FINISHES = ["NORMAL", "FOIL"] as const;
export type PhysicalFinish = (typeof PHYSICAL_FINISHES)[number];

export interface GameplayIdentityCard {
  id: string;
  gameplayIdentityKey?: string | null;
}

export interface CollectorCategoryCard {
  collectorCategory?: CardCollectorCategory | null;
}

export interface TrackabilityTaxonomyCard {
  kind: CardKind;
  gameplayType?: CardGameplayType | null;
}

export function getGameplayIdentityKey(card: GameplayIdentityCard): string {
  const explicitKey = card.gameplayIdentityKey?.trim();
  return explicitKey && explicitKey.length > 0 ? explicitKey : card.id;
}

export function areGameplayEquivalent(cardA: GameplayIdentityCard, cardB: GameplayIdentityCard): boolean {
  return getGameplayIdentityKey(cardA) === getGameplayIdentityKey(cardB);
}

export function getRelatedPrintings<Card extends GameplayIdentityCard>(cards: readonly Card[], card: Card): Card[] {
  const gameplayIdentityKey = getGameplayIdentityKey(card);

  return cards.filter((candidate) => candidate.id !== card.id && getGameplayIdentityKey(candidate) === gameplayIdentityKey);
}

export function isShowcaseCard(card: CollectorCategoryCard): boolean {
  return card.collectorCategory === "SHOWCASE";
}

export function isCollectorCard(card: CollectorCategoryCard): boolean {
  return isShowcaseCard(card);
}
