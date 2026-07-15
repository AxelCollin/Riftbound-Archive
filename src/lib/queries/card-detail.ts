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
import { createOwnedVariantCounts, getOwnedSnapshotQuantityVariant } from "../domain/collection-quantities";
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
  editableUnknownQuantity: number;
  canIncrement: boolean;
  canDecrement: boolean;
};

export type ReservationStatus = "Non acquise" | "Réservée en Normal" | "Réservée en Foil" | "Réservée en Normal et Foil" | "Non réservée";

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
    reservationStatus: ReservationStatus;
    legacyShowcaseCompatibility?: CardPossessionFinish;
  };
  relatedPrintings: RelatedPrinting[];
  translations: CardDetailTranslationRecord[];
  userMeta: CardDetailUserMetaRecord;
  officialRarityRaw: string | null;
  printTreatmentRaw: string | null;
};

function countEditableUnknown(entries: CardDetailCollectionEntryRecord[], variant: "NORMAL" | "FOIL") {
  return entries.reduce((total, entry) => {
    if (entry.cardLanguage !== "UNKNOWN") return total;
    return getOwnedSnapshotQuantityVariant(entry) === variant ? total + entry.quantity : total;
  }, 0);
}

function finishRow(
  counts: { owned: Record<string, number>; binder: Record<string, number>; available: Record<string, number> },
  variant: CardVariant,
  editableUnknownQuantity = 0,
  canIncrement = false,
): CardPossessionFinish {
  return {
    ownedQuantity: getVariantCount(counts.owned, variant),
    binderReservedQuantity: getVariantCount(counts.binder, variant),
    availableQuantity: getVariantCount(counts.available, variant),
    editableUnknownQuantity,
    canIncrement,
    canDecrement: canIncrement && editableUnknownQuantity > 0,
  };
}

export function getReservationStatus(input: { totalOwnedQuantity: number; normal: Pick<CardPossessionFinish, "binderReservedQuantity">; foil: Pick<CardPossessionFinish, "binderReservedQuantity"> }): ReservationStatus {
  if (input.totalOwnedQuantity <= 0) return "Non acquise";
  const normalReserved = input.normal.binderReservedQuantity > 0;
  const foilReserved = input.foil.binderReservedQuantity > 0;
  if (normalReserved && foilReserved) return "Réservée en Normal et Foil";
  if (normalReserved) return "Réservée en Normal";
  if (foilReserved) return "Réservée en Foil";
  return "Non réservée";
}

function sumRows(rows: CardPossessionFinish[]): CardPossessionFinish {
  return rows.reduce(
    (total, row) => ({
      ownedQuantity: total.ownedQuantity + row.ownedQuantity,
      binderReservedQuantity: total.binderReservedQuantity + row.binderReservedQuantity,
      availableQuantity: total.availableQuantity + row.availableQuantity,
      editableUnknownQuantity: total.editableUnknownQuantity + row.editableUnknownQuantity,
      canIncrement: total.canIncrement || row.canIncrement,
      canDecrement: total.canDecrement || row.canDecrement,
    }),
    { ownedQuantity: 0, binderReservedQuantity: 0, availableQuantity: 0, editableUnknownQuantity: 0, canIncrement: false, canDecrement: false },
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
  const isTrackable = isTrackableCard(record);
  const normal = finishRow(counts, "NORMAL", countEditableUnknown(record.collectionEntries, "NORMAL"), isTrackable && supportedFinishVariants.includes("NORMAL"));
  const foil = finishRow(counts, "FOIL", countEditableUnknown(record.collectionEntries, "FOIL"), isTrackable && supportedFinishVariants.includes("FOIL"));

  const legacyShowcaseEntries = record.collectionEntries.filter((entry) => entry.physicalFinish == null && entry.variant === "SHOWCASE");
  const showcaseOwned = createOwnedVariantCounts(record.id, ["SHOWCASE"], legacyShowcaseEntries);
  const showcaseBinder = getBinderReservation({ ...record, hasShowcase: true }, showcaseOwned, record.binderOverrides?.[0]).reserved;
  const showcaseAvailable = getCardAvailability({ ...record, hasShowcase: true }, showcaseOwned, deckAllocationSets, showcaseBinder).available;
  const legacyShowcaseCompatibility = finishRow({ owned: showcaseOwned, binder: showcaseBinder, available: showcaseAvailable }, "SHOWCASE");
  const hasLegacyShowcase = legacyShowcaseCompatibility.ownedQuantity > 0 || legacyShowcaseCompatibility.binderReservedQuantity > 0 || legacyShowcaseCompatibility.availableQuantity > 0;

  const total = sumRows([normal, foil]);
  const reservationStatus = getReservationStatus({ totalOwnedQuantity: total.ownedQuantity, normal, foil });

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
      isTrackable,
      totalOwnedQuantity: total.ownedQuantity,
      totalBinderReservedQuantity: total.binderReservedQuantity,
      totalAvailableQuantity: total.availableQuantity,
      reservationStatus,
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

  const canonicalGameplayIdentityKey = card.gameplayIdentityKey?.trim();
  const relatedPrintingCandidates = canonicalGameplayIdentityKey
    ? await prisma.card.findMany({
        where: {
          id: { not: card.id },
          gameplayIdentityKey: { contains: canonicalGameplayIdentityKey },
        },
        select: cardDetailSelect,
        orderBy: [
          { set: { releasedAt: "asc" } },
          { set: { code: "asc" } },
          { collectorNumber: "asc" },
          { id: "asc" },
        ],
      })
    : [];
  const relatedPrintings = relatedPrintingCandidates.filter(
    (candidate) => candidate.id !== card.id && candidate.gameplayIdentityKey?.trim() === canonicalGameplayIdentityKey,
  );

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
