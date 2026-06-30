import type { DeckAllocationStrategy, DeckStatus } from "@prisma/client";
import { prisma } from "../db";

export type DeckListRow = {
  deckId: string;
  name: string;
  status: DeckStatus;
  allocationStrategy: DeckAllocationStrategy;
  description: string | null;
  deckCardLineCount: number;
  requiredCardQuantity: number;
  allocationLineCount: number;
  allocatedCardQuantity: number;
  createdAt: string;
  updatedAt: string;
};

export type DeckListSummary = {
  totalDecks: number;
  theoreticalDecks: number;
  assembledDecks: number;
  archivedDecks: number;
  totalRequiredCards: number;
  totalAllocatedCards: number;
};

export type DeckListPageData = {
  rows: DeckListRow[];
  summary: DeckListSummary;
};

type DeckListRecord = {
  id: string;
  name: string;
  status: DeckStatus;
  allocationStrategy: DeckAllocationStrategy;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  deckCards: { quantity: number }[];
  allocations: { quantity: number }[];
  _count: {
    deckCards: number;
    allocations: number;
  };
};

function getDeckStatusSortRank(status: DeckStatus): number {
  return status === "ARCHIVED" ? 1 : 0;
}

export function createDeckListRows(decks: DeckListRecord[]): DeckListRow[] {
  return [...decks]
    .sort((left, right) => {
      const statusDelta = getDeckStatusSortRank(left.status) - getDeckStatusSortRank(right.status);
      if (statusDelta !== 0) {
        return statusDelta;
      }

      const updatedAtDelta = right.updatedAt.getTime() - left.updatedAt.getTime();
      if (updatedAtDelta !== 0) {
        return updatedAtDelta;
      }

      return left.name.localeCompare(right.name, "fr");
    })
    .map((deck) => ({
      deckId: deck.id,
      name: deck.name,
      status: deck.status,
      allocationStrategy: deck.allocationStrategy,
      description: deck.description,
      deckCardLineCount: deck._count.deckCards,
      requiredCardQuantity: deck.deckCards.reduce((total, deckCard) => total + deckCard.quantity, 0),
      allocationLineCount: deck._count.allocations,
      allocatedCardQuantity: deck.allocations.reduce((total, allocation) => total + allocation.quantity, 0),
      createdAt: deck.createdAt.toISOString(),
      updatedAt: deck.updatedAt.toISOString(),
    }));
}

export function summarizeDeckListRows(rows: DeckListRow[]): DeckListSummary {
  return rows.reduce<DeckListSummary>(
    (summary, row) => ({
      totalDecks: summary.totalDecks + 1,
      theoreticalDecks: summary.theoreticalDecks + (row.status === "THEORETICAL" ? 1 : 0),
      assembledDecks: summary.assembledDecks + (row.status === "ASSEMBLED" ? 1 : 0),
      archivedDecks: summary.archivedDecks + (row.status === "ARCHIVED" ? 1 : 0),
      totalRequiredCards: summary.totalRequiredCards + row.requiredCardQuantity,
      totalAllocatedCards: summary.totalAllocatedCards + row.allocatedCardQuantity,
    }),
    {
      totalDecks: 0,
      theoreticalDecks: 0,
      assembledDecks: 0,
      archivedDecks: 0,
      totalRequiredCards: 0,
      totalAllocatedCards: 0,
    },
  );
}

export async function getDeckListPageData(): Promise<DeckListPageData> {
  const decks = await prisma.deck.findMany({
    orderBy: [
      { updatedAt: "desc" },
      { name: "asc" },
    ],
    select: {
      id: true,
      name: true,
      status: true,
      allocationStrategy: true,
      description: true,
      createdAt: true,
      updatedAt: true,
      deckCards: { select: { quantity: true } },
      allocations: { select: { quantity: true } },
      _count: { select: { deckCards: true, allocations: true } },
    },
  });

  const rows = createDeckListRows(decks);

  return {
    rows,
    summary: summarizeDeckListRows(rows),
  };
}
