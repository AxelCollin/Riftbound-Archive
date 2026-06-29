import type { CardVariant } from "./variants";

export type OwnedSnapshotQuantityInput = {
  cardId: string;
  variant: CardVariant;
  quantity: number;
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
