import { prisma } from "../db";
import { getBinderReservation } from "../domain/binder";
import {
  isTrackableCard,
  type CardKind,
  type CardRarity,
} from "../domain/cards";
import {
  assertOwnedSnapshotVariantsAllowed,
  normalizeOwnedSnapshotQuantity,
} from "../domain/collection-quantities";
import {
  getAllowedVariants,
  getVariantCount,
  type CardVariant,
  type VariantCounts,
} from "../domain/variants";
import { getDisplayCardName } from "./collection";

type BinderCardTranslation = {
  locale: string;
  name: string;
};

type BinderCollectionEntry = {
  variant: CardVariant;
  quantity: number;
};

export type BinderCardRecord = {
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
  translations: BinderCardTranslation[];
  collectionEntries: BinderCollectionEntry[];
};

export type BinderStatus = "RESERVED" | "MISSING";

export type BinderRow = {
  cardId: string;
  displayName: string;
  setCode: string;
  setName: string;
  collectorNumber: string;
  rarity: CardRarity;
  kind: CardKind;
  printTreatment: "REGULAR" | "ALT" | "OVERNUMBER" | "UNKNOWN";
  allowedVariants: CardVariant[];
  owned: VariantCounts;
  ownedNormal: number;
  ownedFoil: number;
  ownedShowcase: number;
  reservedVariant: CardVariant | null;
  reservedQuantity: number;
  binderStatus: BinderStatus;
};

export type BinderSummary = {
  trackedRows: number;
  reservedRows: number;
  missingRows: number;
};

export type BinderPageData = {
  rows: BinderRow[];
  summary: BinderSummary;
};

export function createBinderRows(cards: BinderCardRecord[]): BinderRow[] {
  return cards.filter(isTrackableCard).map((card) => {
    const allowedVariants = getAllowedVariants(card);
    assertOwnedSnapshotVariantsAllowed(
      card.id,
      card.collectionEntries,
      allowedVariants,
    );

    const owned = createOwnedVariantCounts(
      card.id,
      allowedVariants,
      card.collectionEntries,
    );
    const reserved = getBinderReservation(card, owned).reserved;
    const reservedVariant = allowedVariants.find(
      (variant) => getVariantCount(reserved, variant) > 0,
    ) ?? null;
    const reservedQuantity = reservedVariant
      ? getVariantCount(reserved, reservedVariant)
      : 0;

    return {
      cardId: card.id,
      displayName: getDisplayCardName(card),
      setCode: card.set.code,
      setName: card.set.name,
      collectorNumber: card.collectorNumber ?? "—",
      rarity: card.rarity,
      kind: card.kind,
      printTreatment: card.printTreatment,
      allowedVariants,
      owned,
      ownedNormal: getVariantCount(owned, "NORMAL"),
      ownedFoil: getVariantCount(owned, "FOIL"),
      ownedShowcase: getVariantCount(owned, "SHOWCASE"),
      reservedVariant,
      reservedQuantity,
      binderStatus: reservedQuantity > 0 ? "RESERVED" : "MISSING",
    };
  });
}

function createOwnedVariantCounts(
  cardId: string,
  allowedVariants: CardVariant[],
  collectionEntries: BinderCollectionEntry[],
): VariantCounts {
  const entriesByVariant = new Map(
    collectionEntries.map((entry) => [entry.variant, entry.quantity]),
  );
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

export function summarizeBinderRows(rows: BinderRow[]): BinderSummary {
  return rows.reduce<BinderSummary>(
    (summary, row) => ({
      trackedRows: summary.trackedRows + 1,
      reservedRows: summary.reservedRows +
        (row.binderStatus === "RESERVED" ? 1 : 0),
      missingRows: summary.missingRows +
        (row.binderStatus === "MISSING" ? 1 : 0),
    }),
    { trackedRows: 0, reservedRows: 0, missingRows: 0 },
  );
}

export async function getBinderPageData(): Promise<BinderPageData> {
  const cards = await prisma.card.findMany({
    where: { kind: { in: ["GAMEPLAY", "ENERGY"] } },
    orderBy: [
      { set: { code: "asc" } },
      { collectorNumber: "asc" },
      { name: "asc" },
    ],
    include: {
      set: { select: { code: true, name: true } },
      translations: { select: { locale: true, name: true } },
      collectionEntries: { select: { variant: true, quantity: true } },
    },
  });

  const rows = createBinderRows(cards);

  return {
    rows,
    summary: summarizeBinderRows(rows),
  };
}
