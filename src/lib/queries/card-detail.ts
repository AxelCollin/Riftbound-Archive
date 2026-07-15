import { getCardDetailHref } from "@/app/collection/card-detail-link";
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
import type {
  CardCollectorCategory,
  CardFaction,
  CardGameplayRarity,
  CardGameplayType,
  ShowcaseTreatment,
} from "../domain/card-taxonomy";
import { createOwnedVariantCounts } from "../domain/collection-quantities";
import { getAllowedVariants, getVariantCount, type CardVariant } from "../domain/variants";
import { getDisplayCardName } from "./collection";
import { getFirstCardDetailLookupResult } from "./card-detail-route";

type CardDetailTranslationRecord = {
  locale: string;
  name: string;
  subtitle: string | null;
  rulesText: string | null;
  flavorText: string | null;
};

type CardDetailCollectionEntryRecord = {
  variant: CardVariant;
  physicalFinish?: "NORMAL" | "FOIL" | null;
  cardLanguage?: "FR" | "EN" | "ZH" | "UNKNOWN";
  quantity: number;
};

type CardDetailUserMetaRecord = {
  favorite: boolean;
  note: string | null;
} | null;

type CardDetailSetRecord = {
  code: string;
  name: string;
  releasedAt?: Date | null;
};

export type CardDetailRecord = {
  id: string;
  name: string;
  collectorNumber: string | null;
  rarity: CardRarity;
  kind: CardKind;
  gameplayIdentityKey?: string | null;
  gameplayType?: CardGameplayType | null;
  gameplayRarity?: CardGameplayRarity | null;
  collectorCategory?: CardCollectorCategory | null;
  showcaseTreatment?: ShowcaseTreatment | null;
  printTreatment: "REGULAR" | "ALT" | "OVERNUMBER" | "UNKNOWN";
  hasShowcase: boolean;
  officialRarityRaw: string | null;
  printTreatmentRaw: string | null;
  officialImageUrl: string | null;
  officialArtist: string | null;
  set: CardDetailSetRecord;
  factions?: Array<{ faction: CardFaction }>;
  translations: CardDetailTranslationRecord[];
  collectionEntries: CardDetailCollectionEntryRecord[];
  binderOverrides?: BinderOverrideIntent[];
  userMeta: CardDetailUserMetaRecord;
};

export type CardPossessionFinish = {
  ownedQuantity: number;
  binderReservedQuantity: number;
  availableQuantity: number;
};

export type RelatedPrinting = {
  id: string;
  displayName: string;
  officialImageUrl: string | null;
  set: CardDetailSetRecord;
  collectorNumber: string;
  collectorCategory?: CardCollectorCategory | null;
  showcaseTreatment?: ShowcaseTreatment | null;
  printTreatment: "REGULAR" | "ALT" | "OVERNUMBER" | "UNKNOWN";
  ownedQuantity: number;
  href: string;
};

export type CardDetail = {
  printing: {
    id: string;
    displayName: string;
    officialName: string;
    officialImageUrl: string | null;
    officialArtist: string | null;
    set: CardDetailSetRecord;
    collectorNumber: string;
    gameplayIdentityKey?: string | null;
    gameplayType?: CardGameplayType | null;
    gameplayRarity?: CardGameplayRarity | null;
    collectorCategory?: CardCollectorCategory | null;
    showcaseTreatment?: ShowcaseTreatment | null;
    printTreatment: "REGULAR" | "ALT" | "OVERNUMBER" | "UNKNOWN";
    factions: CardFaction[];
  };
  possession: {
    isTrackable: boolean;
    totalOwnedQuantity: number;
    totalBinderReservedQuantity: number;
    totalAvailableQuantity: number;
    normal: CardPossessionFinish;
    foil: CardPossessionFinish;
    legacyShowcaseCompatibility?: CardPossessionFinish;
  };
  relatedPrintings: RelatedPrinting[];
  translations: CardDetailTranslationRecord[];
  userMeta: CardDetailUserMetaRecord;
  officialRarityRaw: string | null;
  printTreatmentRaw: string | null;
};

function finishRow(counts: { owned: Record<string, number>; binder: Record<string, number>; available: Record<string, number> }, variant: CardVariant): CardPossessionFinish {
  return {
    ownedQuantity: getVariantCount(counts.owned, variant),
    binderReservedQuantity: getVariantCount(counts.binder, variant),
    availableQuantity: getVariantCount(counts.available, variant),
  };
}

function sumRows(rows: CardPossessionFinish[]): CardPossessionFinish {
  return rows.reduce(
    (total, row) => ({
      ownedQuantity: total.ownedQuantity + row.ownedQuantity,
      binderReservedQuantity: total.binderReservedQuantity + row.binderReservedQuantity,
      availableQuantity: total.availableQuantity + row.availableQuantity,
    }),
    { ownedQuantity: 0, binderReservedQuantity: 0, availableQuantity: 0 },
  );
}

function getSupportedPhysicalFinishVariants(card: Pick<CardDetailRecord, "rarity" | "kind" | "gameplayType" | "collectorCategory" | "hasShowcase">): CardVariant[] {
  return getAllowedVariants(card).filter((variant): variant is "NORMAL" | "FOIL" => variant === "NORMAL" || variant === "FOIL");
}

export function createCardDetail(
  record: CardDetailRecord,
  deckAllocationSets: DeckAllocationSet[] = [],
  relatedRecords: CardDetailRecord[] = [],
): CardDetail {
  const supportedFinishVariants = getSupportedPhysicalFinishVariants(record);
  const ownedCounts = createOwnedVariantCounts(record.id, supportedFinishVariants, record.collectionEntries);
  const binderReserved = getBinderReservation(record, ownedCounts, record.binderOverrides?.[0]).reserved;
  const available = getCardAvailability(record, ownedCounts, deckAllocationSets, binderReserved).available;
  const counts = { owned: ownedCounts, binder: binderReserved, available };
  const normal = finishRow(counts, "NORMAL");
  const foil = finishRow(counts, "FOIL");

  const legacyShowcaseEntries = record.collectionEntries.filter((entry) => entry.physicalFinish == null && entry.variant === "SHOWCASE");
  const showcaseOwned = createOwnedVariantCounts(record.id, ["SHOWCASE"], legacyShowcaseEntries);
  const showcaseBinder = getBinderReservation({ ...record, hasShowcase: true }, showcaseOwned, record.binderOverrides?.[0]).reserved;
  const showcaseAvailable = getCardAvailability({ ...record, hasShowcase: true }, showcaseOwned, deckAllocationSets, showcaseBinder).available;
  const legacyShowcaseCompatibility = finishRow({ owned: showcaseOwned, binder: showcaseBinder, available: showcaseAvailable }, "SHOWCASE");
  const hasLegacyShowcase = legacyShowcaseCompatibility.ownedQuantity > 0 || legacyShowcaseCompatibility.binderReservedQuantity > 0 || legacyShowcaseCompatibility.availableQuantity > 0;

  const total = sumRows([normal, foil]);

  return {
    printing: {
      id: record.id,
      displayName: getDisplayCardName(record),
      officialName: record.name,
      officialImageUrl: record.officialImageUrl,
      officialArtist: record.officialArtist,
      set: record.set,
      collectorNumber: record.collectorNumber ?? "—",
      gameplayIdentityKey: record.gameplayIdentityKey,
      gameplayType: record.gameplayType,
      gameplayRarity: record.gameplayRarity,
      collectorCategory: record.collectorCategory,
      showcaseTreatment: record.showcaseTreatment,
      printTreatment: record.printTreatment,
      factions: (record.factions ?? []).map((membership) => membership.faction).sort(),
    },
    possession: {
      isTrackable: isTrackableCard(record),
      totalOwnedQuantity: total.ownedQuantity,
      totalBinderReservedQuantity: total.binderReservedQuantity,
      totalAvailableQuantity: total.availableQuantity,
      normal,
      foil,
      legacyShowcaseCompatibility: hasLegacyShowcase ? legacyShowcaseCompatibility : undefined,
    },
    relatedPrintings: relatedRecords.map((related) => {
      const relatedOwnedCounts = createOwnedVariantCounts(related.id, getSupportedPhysicalFinishVariants(related), related.collectionEntries);
      return {
        id: related.id,
        displayName: getDisplayCardName(related),
        officialImageUrl: related.officialImageUrl,
        set: related.set,
        collectorNumber: related.collectorNumber ?? "—",
        collectorCategory: related.collectorCategory,
        showcaseTreatment: related.showcaseTreatment,
        printTreatment: related.printTreatment,
        ownedQuantity: getVariantCount(relatedOwnedCounts, "NORMAL") + getVariantCount(relatedOwnedCounts, "FOIL"),
        href: getCardDetailHref(related.id),
      };
    }),
    translations: record.translations,
    userMeta: record.userMeta,
    officialRarityRaw: record.officialRarityRaw,
    printTreatmentRaw: record.printTreatmentRaw,
  };
}

const cardDetailSelect = {
  id: true,
  name: true,
  collectorNumber: true,
  rarity: true,
  kind: true,
  gameplayIdentityKey: true,
  gameplayType: true,
  gameplayRarity: true,
  collectorCategory: true,
  showcaseTreatment: true,
  printTreatment: true,
  hasShowcase: true,
  officialRarityRaw: true,
  printTreatmentRaw: true,
  officialImageUrl: true,
  officialArtist: true,
  set: { select: { code: true, name: true, releasedAt: true } },
  factions: { select: { faction: true }, orderBy: { faction: "asc" as const } },
  translations: { orderBy: { locale: "asc" as const }, select: { locale: true, name: true, subtitle: true, rulesText: true, flavorText: true } },
  collectionEntries: { select: { variant: true, physicalFinish: true, cardLanguage: true, quantity: true } },
  binderOverrides: { where: { cardLanguage: "UNKNOWN" as const }, take: 1, select: { mode: true, variant: true, physicalFinish: true, cardLanguage: true, quantity: true } },
  userMeta: { select: { favorite: true, note: true } },
};

export async function getCardDetail(cardId: string): Promise<CardDetail | null> {
  const [card, deckAllocationSets] = await Promise.all([
    prisma.card.findUnique({ where: { id: cardId }, select: cardDetailSelect }),
    getAssembledDeckAllocationSetsForCard(cardId),
  ]);

  if (!card) {
    return null;
  }

  const rawGameplayIdentityKey = card.gameplayIdentityKey;
  const relatedPrintings = rawGameplayIdentityKey?.trim()
    ? await prisma.card.findMany({
        where: { gameplayIdentityKey: rawGameplayIdentityKey, id: { not: card.id } },
        select: cardDetailSelect,
        orderBy: [
          { set: { releasedAt: "asc" } },
          { set: { code: "asc" } },
          { collectorNumber: "asc" },
          { id: "asc" },
        ],
      })
    : [];

  return createCardDetail(card, deckAllocationSets, relatedPrintings);
}

export async function getCardDetailFromRouteParam(routeCardId: string): Promise<CardDetail | null> {
  return getFirstCardDetailLookupResult(routeCardId, getCardDetail);
}

async function getAssembledDeckAllocationSetsForCard(cardId: string): Promise<DeckAllocationSet[]> {
  const assembledDecks = await prisma.deck.findMany({
    where: { status: "ASSEMBLED", allocations: { some: { cardId } } },
    select: { allocations: { where: { cardId }, select: { cardId: true, variant: true, physicalFinish: true, cardLanguage: true, quantity: true } } },
  });

  return assembledDecks.map((deck) => ({ assembled: true, allocations: deck.allocations }));
}
