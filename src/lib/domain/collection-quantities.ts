import type { CardLanguage } from "./card-languages";
import type { PhysicalFinish } from "./physical-finishes";
import { mapLegacyCardVariantToPhysicalFinish } from "./physical-finishes";
import type { CardVariant, VariantCounts } from "./variants";

export type OwnedSnapshotQuantityInput = {
  cardId: string;
  variant: CardVariant;
  quantity: number;
  cardLanguage?: CardLanguage;
};

export type OwnedSnapshotFinishQuantityInput = Pick<OwnedSnapshotQuantityInput, "variant" | "quantity"> & {
  physicalFinish?: PhysicalFinish | null;
};

export function normalizeOwnedSnapshotQuantity({
  cardId,
  variant,
  quantity,
}: OwnedSnapshotQuantityInput): number {
  if (quantity < 0) {
    throw new Error(`Invalid negative CollectionEntry quantity for card ${cardId} variant ${variant}`);
  }

  return quantity;
}

export function assertOwnedSnapshotVariantsAllowed(
  cardId: string,
  entries: Array<Pick<OwnedSnapshotQuantityInput, "variant">>,
  allowedVariants: CardVariant[],
): void {
  const allowedVariantSet = new Set(allowedVariants);

  for (const entry of entries) {
    if (!allowedVariantSet.has(entry.variant)) {
      throw new Error(
        `Invalid CollectionEntry variant ${entry.variant} for card ${cardId}; allowed variants: ${
          allowedVariants.length > 0 ? allowedVariants.join(", ") : "none"
        }`,
      );
    }
  }
}

export function getOwnedSnapshotQuantityVariant(
  entry: Pick<OwnedSnapshotFinishQuantityInput, "variant" | "physicalFinish">,
): CardVariant | null {
  if (entry.physicalFinish) {
    return entry.physicalFinish;
  }

  return mapLegacyCardVariantToPhysicalFinish(entry.variant) ?? (entry.variant === "SHOWCASE" ? "SHOWCASE" : null);
}

export function createOwnedVariantCounts(
  cardId: string,
  allowedVariants: CardVariant[],
  collectionEntries: OwnedSnapshotFinishQuantityInput[],
): VariantCounts {
  const allowedVariantSet = new Set(allowedVariants);
  const entriesByVariant = new Map<CardVariant, number>();

  for (const entry of collectionEntries) {
    const quantityVariant = getOwnedSnapshotQuantityVariant(entry);

    if (!quantityVariant) {
      continue;
    }

    if (!allowedVariantSet.has(quantityVariant)) {
      if (entry.physicalFinish == null && entry.variant === "SHOWCASE") {
        continue;
      }

      throw new Error(
        `Invalid CollectionEntry variant ${quantityVariant} for card ${cardId}; allowed variants: ${
          allowedVariants.length > 0 ? allowedVariants.join(", ") : "none"
        }`,
      );
    }

    if (entriesByVariant.has(quantityVariant) && !("cardLanguage" in entry)) {
      throw new Error(`Duplicate CollectionEntry snapshot for card ${cardId} variant ${quantityVariant}`);
    }

    entriesByVariant.set(quantityVariant, (entriesByVariant.get(quantityVariant) ?? 0) + entry.quantity);
  }

  const ownedCounts: VariantCounts = {};

  for (const variant of allowedVariants) {
    const ownedQuantity = normalizeOwnedSnapshotQuantity({
      cardId,
      variant,
      quantity: entriesByVariant.get(variant) ?? 0,
    });

    if (ownedQuantity > 0) {
      ownedCounts[variant] = ownedQuantity;
    }
  }

  return ownedCounts;
}
