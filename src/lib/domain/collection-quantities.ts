import type { CardVariant, VariantCounts } from "./variants";

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

export function createOwnedVariantCounts(
  cardId: string,
  allowedVariants: CardVariant[],
  collectionEntries: Array<{ variant: CardVariant; quantity: number }>,
): VariantCounts {
  assertOwnedSnapshotVariantsAllowed(
    cardId,
    collectionEntries,
    allowedVariants,
  );

  const entriesByVariant = new Map<CardVariant, number>();

  for (const entry of collectionEntries) {
    if (entriesByVariant.has(entry.variant)) {
      throw new Error(`Duplicate CollectionEntry snapshot for card ${cardId} variant ${entry.variant}`);
    }

    entriesByVariant.set(entry.variant, entry.quantity);
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
