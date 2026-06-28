import { prisma } from "../db";
import { isTrackableCard, type CardKind, type CardRarity } from "../domain/cards";
import { getAllowedVariants, type CardVariant } from "../domain/variants";

type CollectionCardTranslation = {
  locale: string;
  name: string;
};

type CollectionCardEntry = {
  variant: CardVariant;
  quantity: number;
};

export type CollectionCardRecord = {
  id: string;
  name: string;
  collectorNumber: string | null;
  rarity: CardRarity;
  kind: CardKind;
  printTreatment: "REGULAR" | "ALT" | "OVERNUMBER" | "UNKNOWN";
  hasShowcase: boolean;
  set: {
    code: string;
    name: string;
  };
  translations: CollectionCardTranslation[];
  collectionEntries: CollectionCardEntry[];
};

export type CollectionDisplayRow = {
  rowId: string;
  cardId: string;
  cardName: string;
  setCode: string;
  setName: string;
  collectorNumber: string;
  rarity: CardRarity;
  kind: CardKind;
  printTreatment: CollectionCardRecord["printTreatment"];
  variant: CardVariant;
  ownedQuantity: number;
};

export type CollectionRarityFilter = CardRarity | "ALL";
export type CollectionKindFilter = Extract<CardKind, "GAMEPLAY" | "ENERGY"> | "ALL";
export type CollectionVariantFilter = CardVariant | "ALL";
export type CollectionOwnedStatusFilter = "ALL" | "OWNED" | "MISSING";

export type CollectionFilterInput = {
  searchText?: string;
  rarity?: CollectionRarityFilter;
  kind?: CollectionKindFilter;
  variant?: CollectionVariantFilter;
  ownedStatus?: CollectionOwnedStatusFilter;
};

export type CollectionSummary = {
  totalOwnedCopies: number;
  ownedRows: number;
  trackableRows: number;
  missingRows: number;
};

export type CollectionPageData = {
  rows: CollectionDisplayRow[];
  summary: CollectionSummary;
};

const localeFallbackOrder = ["fr-FR", "fr-fr", "fr", "en-US", "en"];

export function getDisplayCardName(card: Pick<CollectionCardRecord, "name" | "translations">): string {
  for (const locale of localeFallbackOrder) {
    const translation = card.translations.find((candidate) => candidate.locale === locale);

    if (translation?.name) {
      return translation.name;
    }
  }

  return card.name;
}

export function createCollectionRows(cards: CollectionCardRecord[]): CollectionDisplayRow[] {
  return cards
    .filter(isTrackableCard)
    .flatMap((card) => {
      const entriesByVariant = new Map(card.collectionEntries.map((entry) => [entry.variant, entry.quantity]));
      const cardName = getDisplayCardName(card);

      return getAllowedVariants(card).map((variant) => ({
        rowId: `${card.id}:${variant}`,
        cardId: card.id,
        cardName,
        setCode: card.set.code,
        setName: card.set.name,
        collectorNumber: card.collectorNumber ?? "—",
        rarity: card.rarity,
        kind: card.kind,
        printTreatment: card.printTreatment,
        variant,
        ownedQuantity: Math.max(0, entriesByVariant.get(variant) ?? 0),
      }));
    });
}

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

function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr-FR")
    .trim();
}

export function summarizeCollectionRows(rows: CollectionDisplayRow[]): CollectionSummary {
  return rows.reduce<CollectionSummary>(
    (summary, row) => ({
      totalOwnedCopies: summary.totalOwnedCopies + row.ownedQuantity,
      ownedRows: summary.ownedRows + (row.ownedQuantity > 0 ? 1 : 0),
      trackableRows: summary.trackableRows + 1,
      missingRows: summary.missingRows + (row.ownedQuantity === 0 ? 1 : 0),
    }),
    {
      totalOwnedCopies: 0,
      ownedRows: 0,
      trackableRows: 0,
      missingRows: 0,
    },
  );
}

export async function getCollectionPageData(): Promise<CollectionPageData> {
  const cards = await prisma.card.findMany({
    orderBy: [{ set: { code: "asc" } }, { collectorNumber: "asc" }, { name: "asc" }],
    include: {
      set: { select: { code: true, name: true } },
      translations: { select: { locale: true, name: true } },
      collectionEntries: { select: { variant: true, quantity: true } },
    },
  });

  const rows = createCollectionRows(cards);

  return {
    rows,
    summary: summarizeCollectionRows(rows),
  };
}
