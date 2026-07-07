import { prisma } from "../db";
import {
  getCardAvailability,
  type DeckAllocationSet,
} from "../domain/availability";
import { getBinderReservation } from "../domain/binder";
import {
  isTrackableCard,
  type CardKind,
  type CardRarity,
} from "../domain/cards";
import type { CardCollectorCategory, CardGameplayType } from "../domain/card-taxonomy";
import {
  createOwnedVariantCounts,
} from "../domain/collection-quantities";
import {
  getAllowedVariants,
  getVariantCount,
  type CardVariant,
} from "../domain/variants";
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
  gameplayType?: CardGameplayType | null;
  collectorCategory?: CardCollectorCategory | null;
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
  binderReservedQuantity: number;
  availableQuantity: number;
};

export type CardDetail = {
  id: string;
  displayName: string;
  officialName: string;
  collectorNumber: string;
  rarity: CardRarity;
  kind: CardKind;
  gameplayType?: CardGameplayType | null;
  collectorCategory?: CardCollectorCategory | null;
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

export function createCardDetail(
  record: CardDetailRecord,
  deckAllocationSets: DeckAllocationSet[] = [],
): CardDetail {
  const allowedVariants = getAllowedVariants(record);
  const ownedCounts = createOwnedVariantCounts(
    record.id,
    allowedVariants,
    record.collectionEntries,
  );
  const binderReserved = getBinderReservation(record, ownedCounts).reserved;
  const available = getCardAvailability(
    record,
    ownedCounts,
    deckAllocationSets,
    binderReserved,
  ).available;

  return {
    id: record.id,
    displayName: getDisplayCardName(record),
    officialName: record.name,
    collectorNumber: record.collectorNumber ?? "—",
    rarity: record.rarity,
    kind: record.kind,
    gameplayType: record.gameplayType,
    collectorCategory: record.collectorCategory,
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
      ownedQuantity: getVariantCount(ownedCounts, variant),
      binderReservedQuantity: getVariantCount(binderReserved, variant),
      availableQuantity: getVariantCount(available, variant),
    })),
    isTrackable: isTrackableCard(record),
    userMeta: record.userMeta,
  };
}

export async function getCardDetail(
  cardId: string,
): Promise<CardDetail | null> {
  const [card, deckAllocationSets] = await Promise.all([
    prisma.card.findUnique({
      where: { id: cardId },
      include: {
        set: { select: { code: true, name: true } },
        translations: {
          orderBy: { locale: "asc" },
          select: {
            locale: true,
            name: true,
            subtitle: true,
            rulesText: true,
            flavorText: true,
          },
        },
        collectionEntries: { select: { variant: true, physicalFinish: true, quantity: true } },
        userMeta: { select: { favorite: true, note: true } },
      },
    }),
    getAssembledDeckAllocationSetsForCard(cardId),
  ]);

  return card ? createCardDetail(card, deckAllocationSets) : null;
}

export async function getCardDetailFromRouteParam(
  routeCardId: string,
): Promise<CardDetail | null> {
  return getFirstCardDetailLookupResult(routeCardId, getCardDetail);
}

async function getAssembledDeckAllocationSetsForCard(
  cardId: string,
): Promise<DeckAllocationSet[]> {
  const assembledDecks = await prisma.deck.findMany({
    where: {
      status: "ASSEMBLED",
      allocations: { some: { cardId } },
    },
    select: {
      allocations: {
        where: { cardId },
        select: { cardId: true, variant: true, quantity: true },
      },
    },
  });

  return assembledDecks.map((deck) => ({
    assembled: true,
    allocations: deck.allocations,
  }));
}
