import type { RiftboundCard } from "./cards";
import { isTrackableCard } from "./cards";
import { isShowcaseCard } from "./card-taxonomy";
import type { PhysicalFinish } from "./physical-finishes";
import { mapLegacyCardVariantToPhysicalFinish } from "./physical-finishes";
import type { CardVariant, VariantCounts } from "./variants";
import { getAllowedVariants, getVariantCount, supportsNormalVariant } from "./variants";

export type BinderMode = "AUTO" | "DISABLED" | "FORCE_VARIANT";

export interface BinderOverrideIntent {
  mode: BinderMode;
  variant?: CardVariant | null;
  physicalFinish?: PhysicalFinish | null;
  quantity?: number | null;
}

export interface BinderReservation {
  cardId: string;
  reserved: VariantCounts;
}

export function getBinderReservation(
  card: Pick<RiftboundCard, "id" | "kind" | "gameplayType" | "collectorCategory" | "rarity"> & Partial<Pick<RiftboundCard, "hasShowcase">>,
  owned: VariantCounts,
  override?: BinderOverrideIntent | null,
): BinderReservation {
  const reserved: VariantCounts = {};

  if (!isTrackableCard(card) || isShowcaseCard(card)) {
    return { cardId: card.id, reserved };
  }

  if (override?.mode === "DISABLED") {
    return { cardId: card.id, reserved };
  }

  if (override?.mode === "FORCE_VARIANT") {
    const variantToReserve = getBinderOverrideReservationVariant(override);
    const quantityToReserve = Math.max(0, override.quantity ?? 1);

    if (
      variantToReserve
      && quantityToReserve > 0
      && getAllowedVariants({ ...card, hasShowcase: card.hasShowcase ?? false }).includes(variantToReserve)
      && getVariantCount(owned, variantToReserve) > 0
    ) {
      reserved[variantToReserve] = Math.min(quantityToReserve, getVariantCount(owned, variantToReserve));
    }

    return { cardId: card.id, reserved };
  }

  const variantToReserve = getDefaultBinderVariant(card, owned);

  if (variantToReserve) {
    reserved[variantToReserve] = 1;
  }

  return { cardId: card.id, reserved };
}

export function getBinderOverrideReservationVariant(
  override: Pick<BinderOverrideIntent, "variant" | "physicalFinish">,
): CardVariant | null {
  if (override.physicalFinish) {
    return override.physicalFinish;
  }

  return override.variant ? mapLegacyCardVariantToPhysicalFinish(override.variant) : null;
}

function getDefaultBinderVariant(
  card: Pick<RiftboundCard, "kind" | "gameplayType" | "collectorCategory" | "rarity">,
  owned: VariantCounts,
): CardVariant | undefined {
  if (getVariantCount(owned, "FOIL") > 0) {
    return "FOIL";
  }

  if (supportsNormalVariant(card) && getVariantCount(owned, "NORMAL") > 0) {
    return "NORMAL";
  }

  return undefined;
}
