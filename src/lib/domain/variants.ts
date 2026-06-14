import type { CardRarity, RiftboundCard } from "./cards";
import { isTrackableCard } from "./cards";

export const CARD_VARIANTS = ["NORMAL", "FOIL", "SHOWCASE", "SHOWCASE_FOIL"] as const;
export type CardVariant = (typeof CARD_VARIANTS)[number];

export type VariantCounts = Partial<Record<CardVariant, number>>;

const normalAndFoilRarities = new Set<CardRarity>(["COMMON", "UNCOMMON"]);

export function supportsNormalVariant(card: Pick<RiftboundCard, "rarity" | "kind">): boolean {
  return isTrackableCard(card) && normalAndFoilRarities.has(card.rarity);
}

export function isShowcaseVariant(variant: CardVariant): boolean {
  return variant === "SHOWCASE" || variant === "SHOWCASE_FOIL";
}

export function getAllowedVariants(card: Pick<RiftboundCard, "rarity" | "kind" | "hasShowcase">): CardVariant[] {
  if (!isTrackableCard(card)) {
    return [];
  }

  const variants: CardVariant[] = supportsNormalVariant(card) ? ["NORMAL", "FOIL"] : ["FOIL"];

  if (card.hasShowcase) {
    variants.push("SHOWCASE", "SHOWCASE_FOIL");
  }

  return variants;
}

export function getVariantCount(counts: VariantCounts, variant: CardVariant): number {
  return Math.max(0, counts[variant] ?? 0);
}
