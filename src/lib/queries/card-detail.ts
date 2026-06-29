import { prisma } from "../db";
import { isTrackableCard, type CardKind, type CardRarity } from "../domain/cards";
import { normalizeOwnedSnapshotQuantity } from "../domain/collection-quantities";
import { getAllowedVariants, type CardVariant } from "../domain/variants";
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
  quantity: number;
};

type CardDetailUserMetaRecord = {
  favorite: boolean;
  note: string | null;
} | null;

export type CardDetailRecord = {
  id: string;
  name: string;
  collectorNumber: string | null;
  rarity: CardRarity;
  kind: CardKind;
  printTreatment: "REGULAR" | "ALT" | "OVERNUMBER" | "UNKNOWN";
  hasShowcase: boolean;
  officialRarityRaw: string | null;
  printTreatmentRaw: string | null;
  officialImageUrl: string | null;
  officialArtist: string | null;
  set: {
    code: string;
    name: string;
  };
  translations: CardDetailTranslationRecord[];
  collectionEntries: CardDetailCollectionEntryRecord[];
  userMeta: CardDetailUserMetaRecord;
};

export type CardOwnershipVariantRow = {
  variant: CardVariant;
  ownedQuantity: number;
};

export type CardDetail = {
  id: string;
  displayName: string;
  officialName: string;
  collectorNumber: string;
  rarity: CardRarity;
  kind: CardKind;
  printTreatment: "REGULAR" | "ALT" | "OVERNUMBER" | "UNKNOWN";
  hasShowcase: boolean;
  officialRarityRaw: string | null;
  printTreatmentRaw: string | null;
  officialImageUrl: string | null;
  officialArtist: string | null;
  set: {
    code: string;
    name: string;
  };
  translations: CardDetailTranslationRecord[];
  ownershipRows: CardOwnershipVariantRow[];
  isTrackable: boolean;
  userMeta: CardDetailUserMetaRecord;
};

export function createCardDetail(record: CardDetailRecord): CardDetail {
  const entriesByVariant = new Map(record.collectionEntries.map((entry) => [entry.variant, entry.quantity]));
  const allowedVariants = getAllowedVariants(record);

  return {
    id: record.id,
    displayName: getDisplayCardName(record),
    officialName: record.name,
    collectorNumber: record.collectorNumber ?? "—",
    rarity: record.rarity,
    kind: record.kind,
    printTreatment: record.printTreatment,
    hasShowcase: record.hasShowcase,
    officialRarityRaw: record.officialRarityRaw,
    printTreatmentRaw: record.printTreatmentRaw,
    officialImageUrl: record.officialImageUrl,
    officialArtist: record.officialArtist,
    set: record.set,
    translations: record.translations,
    ownershipRows: allowedVariants.map((variant) => ({
      variant,
      ownedQuantity: normalizeOwnedSnapshotQuantity({
        cardId: record.id,
        variant,
        quantity: entriesByVariant.get(variant) ?? 0,
      }),
    })),
    isTrackable: isTrackableCard(record),
    userMeta: record.userMeta,
  };
}

export async function getCardDetail(cardId: string): Promise<CardDetail | null> {
  const card = await prisma.card.findUnique({
    where: { id: cardId },
    include: {
      set: { select: { code: true, name: true } },
      translations: {
        orderBy: { locale: "asc" },
        select: { locale: true, name: true, subtitle: true, rulesText: true, flavorText: true },
      },
      collectionEntries: { select: { variant: true, quantity: true } },
      userMeta: { select: { favorite: true, note: true } },
    },
  });

  return card ? createCardDetail(card) : null;
}

export async function getCardDetailFromRouteParam(routeCardId: string): Promise<CardDetail | null> {
  return getFirstCardDetailLookupResult(routeCardId, getCardDetail);
}
