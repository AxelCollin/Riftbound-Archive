import type { CardRarity, RiftboundCard } from "./cards";
import { isTrackableCard } from "./cards";

export const CARD_VARIANTS = ["NORMAL", "FOIL", "SHOWCASE"] as const;
export type CardVariant = (typeof CARD_VARIANTS)[number];

export type VariantCounts = Partial<Record<CardVariant, number>>;

const normalAndFoilRarities = new Set<CardRarity>(["COMMON", "UNCOMMON"]);

export function supportsNormalVariant(card: Pick<RiftboundCard, "rarity" | "kind" | "gameplayType">): boolean {
  return isTrackableCard(card) && normalAndFoilRarities.has(card.rarity);
}

export function isShowcaseVariant(variant: CardVariant): boolean {
  return variant === "SHOWCASE";
}

export function getAllowedVariants(card: Pick<RiftboundCard, "rarity" | "kind" | "gameplayType" | "collectorCategory" | "hasShowcase">): CardVariant[] {
  if (!isTrackableCard(card)) {
    return [];
  }

  const variants: CardVariant[] = supportsNormalVariant(card) ? ["NORMAL", "FOIL"] : ["FOIL"];

  if (card.collectorCategory !== "SHOWCASE" && card.hasShowcase) {
    variants.push("SHOWCASE");
  }

  return variants;
}

export function getVariantCount(counts: VariantCounts, variant: CardVariant): number {
  return Math.max(0, counts[variant] ?? 0);
}
