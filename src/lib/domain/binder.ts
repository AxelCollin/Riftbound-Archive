import type { RiftboundCard } from "./cards";
import { isTrackableCard } from "./cards";
import type { CardVariant, VariantCounts } from "./variants";
import { getVariantCount, supportsNormalVariant } from "./variants";

export type BinderMode = "AUTO" | "DISABLED" | "FORCE_VARIANT";

export interface BinderReservation {
  cardId: string;
  reserved: VariantCounts;
}

export function getBinderReservation(
  card: Pick<RiftboundCard, "id" | "kind" | "rarity">,
  owned: VariantCounts,
): BinderReservation {
  const reserved: VariantCounts = {};

  if (!isTrackableCard(card)) {
    return { cardId: card.id, reserved };
  }

  const variantToReserve = getDefaultBinderVariant(card, owned);

  if (variantToReserve) {
    reserved[variantToReserve] = 1;
  }

  return { cardId: card.id, reserved };
}

function getDefaultBinderVariant(
  card: Pick<RiftboundCard, "kind" | "rarity">,
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
