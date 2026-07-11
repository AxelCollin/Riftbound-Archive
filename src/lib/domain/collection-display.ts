import type { CardKind, CardRarity } from "./cards";
import type { CardVariant } from "./variants";

export type CollectionDisplayRow = {
  rowId: string;
  cardId: string;
  cardName: string;
  officialImageUrl: string | null;
  setCode: string;
  setName: string;
  collectorNumber: string;
  rarity: CardRarity;
  kind: CardKind;
  printTreatment: "REGULAR" | "ALT" | "OVERNUMBER" | "UNKNOWN";
  variant: CardVariant;
  ownedQuantity: number;
  binderReservedQuantity: number;
  availableQuantity: number;
};

export type CollectionRarityFilter = CardRarity | "ALL";
export type CollectionKindFilter = Extract<CardKind, "GAMEPLAY" | "ENERGY"> | "ALL";
export type CollectionVariantFilter = CardVariant | "ALL";
export type CollectionOwnedStatusFilter = "ALL" | "OWNED" | "MISSING";
export type CollectionDisplayMode = "OWNED" | "AVAILABLE";

export const defaultCollectionDisplayMode: CollectionDisplayMode = "OWNED";

export type CollectionFilterInput = {
  searchText?: string;
  rarity?: CollectionRarityFilter;
  kind?: CollectionKindFilter;
  variant?: CollectionVariantFilter;
  ownedStatus?: CollectionOwnedStatusFilter;
};

export function filterCollectionRows(
  rows: CollectionDisplayRow[],
  filters: CollectionFilterInput = {},
): CollectionDisplayRow[] {
  const searchText = normalizeSearchText(filters.searchText ?? "");
  const rarity = filters.rarity ?? "ALL";
  const kind = filters.kind ?? "ALL";
  const variant = filters.variant ?? "ALL";
  const ownedStatus = filters.ownedStatus ?? "ALL";

  return rows.filter((row) => {
    const matchesSearch =
      searchText.length === 0 ||
      [row.cardName, row.setCode, row.collectorNumber].some((value) => normalizeSearchText(value).includes(searchText));
    const matchesRarity = rarity === "ALL" || row.rarity === rarity;
    const matchesKind = kind === "ALL" || row.kind === kind;
    const matchesVariant = variant === "ALL" || row.variant === variant;
    const matchesOwnedStatus =
      ownedStatus === "ALL" ||
      (ownedStatus === "OWNED" && row.ownedQuantity > 0) ||
      (ownedStatus === "MISSING" && row.ownedQuantity === 0);

    return matchesSearch && matchesRarity && matchesKind && matchesVariant && matchesOwnedStatus;
  });
}

export function getCollectionDisplayQuantity(row: CollectionDisplayRow, mode: CollectionDisplayMode = defaultCollectionDisplayMode): number {
  return mode === "AVAILABLE" ? row.availableQuantity : row.ownedQuantity;
}

export function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr-FR")
    .trim();
}
