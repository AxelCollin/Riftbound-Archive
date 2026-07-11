import { prisma } from "../db";
import {
  getCardAvailability,
  type DeckAllocationSet,
} from "../domain/availability";
import { getBinderReservation, type BinderOverrideIntent } from "../domain/binder";
import {
  isTrackableCard,
  type CardKind,
  type CardRarity,
} from "../domain/cards";
import type { CardCollectorCategory, CardGameplayType } from "../domain/card-taxonomy";
import type { CollectionDisplayRow } from "../domain/collection-display";
import { createOwnedVariantCounts } from "../domain/collection-quantities";
import {
  getAllowedVariants,
  getVariantCount,
  type CardVariant,
} from "../domain/variants";

type CollectionCardTranslation = {
  locale: string;
  name: string;
};

type CollectionCardEntry = {
  variant: CardVariant;
  physicalFinish?: "NORMAL" | "FOIL" | null;
  cardLanguage?: "FR" | "EN" | "ZH" | "UNKNOWN";
  quantity: number;
};

export type CollectionCardRecord = {
  id: string;
  name: string;
  collectorNumber: string | null;
  officialImageUrl: string | null;
  rarity: CardRarity;
  kind: CardKind;
  gameplayType?: CardGameplayType | null;
  collectorCategory?: CardCollectorCategory | null;
  printTreatment: "REGULAR" | "ALT" | "OVERNUMBER" | "UNKNOWN";
  hasShowcase: boolean;
  set: {
    code: string;
    name: string;
  };
  translations: CollectionCardTranslation[];
  collectionEntries: CollectionCardEntry[];
  binderOverrides?: BinderOverrideIntent[];
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

export function getDisplayCardName(
  card: Pick<CollectionCardRecord, "name" | "translations">,
): string {
  for (const locale of localeFallbackOrder) {
    const translation = card.translations.find(
      (candidate) => candidate.locale === locale,
    );

    if (translation?.name) {
      return translation.name;
    }
  }

  return card.name;
}

export function createCollectionRows(
  cards: CollectionCardRecord[],
  deckAllocationSets: DeckAllocationSet[] = [],
): CollectionDisplayRow[] {
  return cards.filter(isTrackableCard).flatMap((card) => {
    const allowedVariants = getAllowedVariants(card);
    const ownedCounts = createOwnedVariantCounts(
      card.id,
      allowedVariants,
      card.collectionEntries,
    );
    const binderReserved = getBinderReservation(card, ownedCounts, card.binderOverrides?.[0]).reserved;
    const available = getCardAvailability(
      card,
      ownedCounts,
      deckAllocationSets,
      binderReserved,
    ).available;
    const cardName = getDisplayCardName(card);

    const normalOwnedQuantity = getVariantCount(ownedCounts, "NORMAL");
    const normalBinderReservedQuantity = getVariantCount(binderReserved, "NORMAL");
    const normalAvailableQuantity = getVariantCount(available, "NORMAL");
    const foilOwnedQuantity = getVariantCount(ownedCounts, "FOIL");
    const foilBinderReservedQuantity = getVariantCount(binderReserved, "FOIL");
    const foilAvailableQuantity = getVariantCount(available, "FOIL");
    const legacyShowcaseOwnedQuantity = card.collectorCategory === "SHOWCASE" ? 0 : getVariantCount(ownedCounts, "SHOWCASE");
    const legacyShowcaseBinderReservedQuantity = card.collectorCategory === "SHOWCASE" ? 0 : getVariantCount(binderReserved, "SHOWCASE");
    const legacyShowcaseAvailableQuantity = card.collectorCategory === "SHOWCASE" ? 0 : getVariantCount(available, "SHOWCASE");

    // Legacy SHOWCASE CollectionEntry rows can still be written for standard
    // cards with hasShowcase=true. Keep those copies visible as compatibility
    // quantities, but do not merge them into Normal/Foil finish totals. Real
    // Showcase printed cards remain separate Card records.
    return [{
      rowId: card.id,
      cardId: card.id,
      cardName,
      officialImageUrl: card.officialImageUrl,
      setCode: card.set.code,
      setName: card.set.name,
      collectorNumber: card.collectorNumber ?? "—",
      rarity: card.rarity,
      kind: card.kind,
      printTreatment: card.printTreatment,
      collectorCategory: card.collectorCategory,
      normalOwnedQuantity,
      normalBinderReservedQuantity,
      normalAvailableQuantity,
      foilOwnedQuantity,
      foilBinderReservedQuantity,
      foilAvailableQuantity,
      legacyShowcaseOwnedQuantity,
      legacyShowcaseBinderReservedQuantity,
      legacyShowcaseAvailableQuantity,
      totalOwnedQuantity: normalOwnedQuantity + foilOwnedQuantity + legacyShowcaseOwnedQuantity,
      totalBinderReservedQuantity: normalBinderReservedQuantity + foilBinderReservedQuantity + legacyShowcaseBinderReservedQuantity,
      totalAvailableQuantity: normalAvailableQuantity + foilAvailableQuantity + legacyShowcaseAvailableQuantity,
    }];
  });
}

export function summarizeCollectionRows(
  rows: CollectionDisplayRow[],
): CollectionSummary {
  return rows.reduce<CollectionSummary>(
    (summary, row) => ({
      totalOwnedCopies: summary.totalOwnedCopies + row.totalOwnedQuantity,
      ownedRows: summary.ownedRows + (row.totalOwnedQuantity > 0 ? 1 : 0),
      trackableRows: summary.trackableRows + 1,
      missingRows: summary.missingRows + (row.totalOwnedQuantity === 0 ? 1 : 0),
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
  const [cards, deckAllocationSets] = await Promise.all([
    prisma.card.findMany({
      where: { kind: { in: ["GAMEPLAY", "ENERGY"] } },
      orderBy: [
        { set: { code: "asc" } },
        { collectorNumber: "asc" },
        { name: "asc" },
      ],
      select: {
        id: true,
        name: true,
        collectorNumber: true,
        officialImageUrl: true,
        rarity: true,
        kind: true,
        gameplayType: true,
        collectorCategory: true,
        printTreatment: true,
        hasShowcase: true,
        set: { select: { code: true, name: true } },
        translations: { select: { locale: true, name: true } },
        collectionEntries: { select: { variant: true, physicalFinish: true, cardLanguage: true, quantity: true } },
        binderOverrides: { where: { cardLanguage: "UNKNOWN" }, take: 1, select: { mode: true, variant: true, physicalFinish: true, cardLanguage: true, quantity: true } },
      },
    }),
    getAssembledDeckAllocationSets(),
  ]);

  const rows = createCollectionRows(cards, deckAllocationSets);

  return {
    rows,
    summary: summarizeCollectionRows(rows),
  };
}

async function getAssembledDeckAllocationSets(): Promise<DeckAllocationSet[]> {
  const assembledDecks = await prisma.deck.findMany({
    where: { status: "ASSEMBLED" },
    select: {
      allocations: {
        select: { cardId: true, variant: true, physicalFinish: true, quantity: true },
      },
    },
  });

  return assembledDecks.map((deck) => ({
    assembled: true,
    allocations: deck.allocations,
  }));
}
