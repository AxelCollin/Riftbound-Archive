import { prisma } from "@/lib/db";
import { getCardAvailability, type DeckAllocationSet } from "@/lib/domain/availability";
import { getBinderReservation } from "@/lib/domain/binder";
import { planAssembledDeckAllocations } from "@/lib/domain/deck-assembly";
import { createOwnedVariantCounts } from "@/lib/domain/collection-quantities";
import { getAllowedVariants } from "@/lib/domain/variants";
import type { CardGameplayType } from "@/lib/domain/card-taxonomy";


type AssemblyCardRecord = {
  id: string;
  kind: "GAMEPLAY" | "ENERGY" | "TOKEN" | "RULES";
  gameplayType?: CardGameplayType | null;
  rarity: "COMMON" | "UNCOMMON" | "RARE" | "EPIC" | "ULTIMATE" | "UNKNOWN";
  hasShowcase: boolean;
  collectionEntries: { variant: "NORMAL" | "FOIL" | "SHOWCASE"; quantity: number }[];
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
                rarity: true,
                hasShowcase: true,
                collectionEntries: { select: { variant: true, quantity: true } },
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
      select: { allocations: { select: { cardId: true, variant: true, quantity: true } } },
    });

    const cards = uniqueCards(deck.deckCards.map((requirement) => requirement.card));
    const deckAllocationSets = assembledDecks.map((assembledDeck) => ({ assembled: true, allocations: assembledDeck.allocations } satisfies DeckAllocationSet));
    const availabilityByCard = cards.map((card) => {
      const allowedVariants = getAllowedVariants(card);
      const ownedCounts = createOwnedVariantCounts(card.id, allowedVariants, card.collectionEntries);
      const binderReserved = getBinderReservation(card, ownedCounts).reserved;

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
