import type { PhysicalFinish } from "./physical-finishes";
import { mapLegacyCardVariantToPhysicalFinish } from "./physical-finishes";
import type { CardVariant } from "./variants";

export type PricingFinishCompatibilityRow = {
  variant: CardVariant;
  physicalFinish?: PhysicalFinish | null;
};

export function getEffectivePricingPhysicalFinish(row: PricingFinishCompatibilityRow): PhysicalFinish | null {
  return row.physicalFinish ?? mapLegacyCardVariantToPhysicalFinish(row.variant);
}
