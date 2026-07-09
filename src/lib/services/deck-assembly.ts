import { prisma } from "@/lib/db";
import { getCardAvailability, type DeckAllocationSet } from "@/lib/domain/availability";
import { getBinderReservation, type BinderOverrideIntent } from "@/lib/domain/binder";
import { planAssembledDeckAllocations } from "@/lib/domain/deck-assembly";
import { createOwnedVariantCounts } from "@/lib/domain/collection-quantities";
import { getAllowedVariants } from "@/lib/domain/variants";
import type { CardCollectorCategory, CardGameplayType } from "@/lib/domain/card-taxonomy";


type AssemblyCardRecord = {
  id: string;
  kind: "GAMEPLAY" | "ENERGY" | "TOKEN" | "RULES";
  gameplayType?: CardGameplayType | null;
  collectorCategory?: CardCollectorCategory | null;
  rarity: "COMMON" | "UNCOMMON" | "RARE" | "EPIC" | "ULTIMATE" | "UNKNOWN";
  hasShowcase: boolean;
  collectionEntries: { variant: "NORMAL" | "FOIL" | "SHOWCASE"; physicalFinish?: "NORMAL" | "FOIL" | null; cardLanguage?: "FR" | "EN" | "ZH" | "UNKNOWN"; quantity: number }[];
  binderOverrides?: BinderOverrideIntent[];
};

export async function assembleDeck(deckId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const deck = await tx.deck.findUnique({
      where: { id: deckId },
      select: {
        id: true,
        status: true,
        deckCards: {
          select: {
            cardId: true,
            quantity: true,
            preferredVariant: true,
            card: {
              select: {
                id: true,
                kind: true,
                gameplayType: true,
                collectorCategory: true,
                rarity: true,
                hasShowcase: true,
                collectionEntries: { select: { variant: true, physicalFinish: true, cardLanguage: true, quantity: true } },
                binderOverrides: { where: { cardLanguage: "UNKNOWN" }, take: 1, select: { mode: true, variant: true, physicalFinish: true, cardLanguage: true, quantity: true } },
              },
            },
          },
        },
        allocations: { select: { id: true } },
      },
    });

    if (!deck) {
      throw new Error("Deck not found.");
    }

    if (deck.status === "ASSEMBLED") {
      throw new Error("Deck is already assembled.");
    }

    if (deck.status !== "THEORETICAL") {
      throw new Error("Only theoretical decks can be assembled.");
    }

    if (deck.allocations.length > 0) {
      throw new Error("Deck already has persisted allocations.");
    }

    if (deck.deckCards.length === 0) {
      throw new Error("Cannot assemble a deck without card requirements.");
    }

    const assembledDecks = await tx.deck.findMany({
      where: { status: "ASSEMBLED", id: { not: deckId } },
      select: { allocations: { select: { cardId: true, variant: true, physicalFinish: true, quantity: true } } },
    });

    const cards = uniqueCards(deck.deckCards.map((requirement) => requirement.card));
    const deckAllocationSets = assembledDecks.map((assembledDeck) => ({ assembled: true, allocations: assembledDeck.allocations } satisfies DeckAllocationSet));
    const availabilityByCard = cards.map((card) => {
      const allowedVariants = getAllowedVariants(card);
      const ownedCounts = createOwnedVariantCounts(card.id, allowedVariants, card.collectionEntries);
      const binderReserved = getBinderReservation(card, ownedCounts, card.binderOverrides?.[0]).reserved;

      return getCardAvailability(card, ownedCounts, deckAllocationSets, binderReserved);
    });

    const plan = planAssembledDeckAllocations(
      deck.deckCards.map((requirement) => ({
        cardId: requirement.cardId,
        quantity: requirement.quantity,
        preferredVariant: requirement.preferredVariant,
      })),
      availabilityByCard,
      cards,
    );

    if (!plan.ok) {
      throw new Error(plan.error);
    }

    for (const allocation of plan.allocations) {
      await tx.deckCardAllocation.create({
        data: {
          deckId,
          cardId: allocation.cardId,
          variant: allocation.variant,
          physicalFinish: allocation.physicalFinish,
          cardLanguage: "UNKNOWN",
          quantity: allocation.quantity,
        },
      });
    }

    await tx.deck.update({ where: { id: deckId }, data: { status: "ASSEMBLED" } });
  });
}

function uniqueCards(cards: AssemblyCardRecord[]): AssemblyCardRecord[] {
  return Array.from(new Map(cards.map((card) => [card.id, card])).values());
}

export async function disassembleDeck(deckId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const deck = await tx.deck.findUnique({
      where: { id: deckId },
      select: { status: true },
    });

    if (!deck) {
      throw new Error("Deck not found.");
    }

    if (deck.status !== "ASSEMBLED") {
      throw new Error("Only assembled decks can be disassembled.");
    }

    await tx.deckCardAllocation.deleteMany({ where: { deckId } });
    await tx.deck.update({ where: { id: deckId }, data: { status: "THEORETICAL" } });
  });
}
