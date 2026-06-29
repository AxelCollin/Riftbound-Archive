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
