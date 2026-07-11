import type { CardKind, CardRarity } from "./cards";
import type { CardCollectorCategory } from "./card-taxonomy";

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
  collectorCategory?: CardCollectorCategory | null;
  normalOwnedQuantity: number;
  normalBinderReservedQuantity: number;
  normalAvailableQuantity: number;
  foilOwnedQuantity: number;
  foilBinderReservedQuantity: number;
  foilAvailableQuantity: number;
  legacyShowcaseOwnedQuantity: number;
  legacyShowcaseBinderReservedQuantity: number;
  legacyShowcaseAvailableQuantity: number;
  totalOwnedQuantity: number;
  totalBinderReservedQuantity: number;
  totalAvailableQuantity: number;
};

export type CollectionRarityFilter = CardRarity | "ALL";
export type CollectionKindFilter = Extract<CardKind, "GAMEPLAY" | "ENERGY"> | "ALL";
export type CollectionOwnedStatusFilter = "ALL" | "OWNED" | "MISSING";
export type CollectionDisplayMode = "OWNED" | "AVAILABLE";

export const defaultCollectionDisplayMode: CollectionDisplayMode = "OWNED";

export type CollectionFilterInput = {
  searchText?: string;
  rarity?: CollectionRarityFilter;
  kind?: CollectionKindFilter;
  ownedStatus?: CollectionOwnedStatusFilter;
};

export function filterCollectionRows(
  rows: CollectionDisplayRow[],
  filters: CollectionFilterInput = {},
): CollectionDisplayRow[] {
  const searchText = normalizeSearchText(filters.searchText ?? "");
  const rarity = filters.rarity ?? "ALL";
  const kind = filters.kind ?? "ALL";
  const ownedStatus = filters.ownedStatus ?? "ALL";

  return rows.filter((row) => {
    const matchesSearch =
      searchText.length === 0 ||
      [row.cardName, row.setCode, row.collectorNumber].some((value) => normalizeSearchText(value).includes(searchText));
    const matchesRarity = rarity === "ALL" || row.rarity === rarity;
    const matchesKind = kind === "ALL" || row.kind === kind;
    const matchesOwnedStatus =
      ownedStatus === "ALL" ||
      (ownedStatus === "OWNED" && row.totalOwnedQuantity > 0) ||
      (ownedStatus === "MISSING" && row.totalOwnedQuantity === 0);

    return matchesSearch && matchesRarity && matchesKind && matchesOwnedStatus;
  });
}

export function getCollectionDisplayQuantity(row: CollectionDisplayRow, mode: CollectionDisplayMode = defaultCollectionDisplayMode): number {
  return mode === "AVAILABLE" ? row.totalAvailableQuantity : row.totalOwnedQuantity;
}

export function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr-FR")
    .trim();
}
