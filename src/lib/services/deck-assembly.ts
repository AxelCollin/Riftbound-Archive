import { prisma } from "@/lib/db";
import { getCardAvailability, getDeckAllocationQuantityVariant, type DeckAllocationSet } from "@/lib/domain/availability";
import { getBinderReservation, type BinderOverrideIntent } from "@/lib/domain/binder";
import type { CardLanguage } from "@/lib/domain/card-languages";
import { planAssembledDeckAllocations } from "@/lib/domain/deck-assembly";
import { createOwnedVariantCounts } from "@/lib/domain/collection-quantities";
import { getAllowedVariants, type CardVariant } from "@/lib/domain/variants";
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

const LANGUAGE_ALLOCATION_ORDER: CardLanguage[] = ["UNKNOWN", "FR", "EN", "ZH"];

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
      select: { allocations: { select: { cardId: true, variant: true, physicalFinish: true, cardLanguage: true, quantity: true } } },
    });

    const cards = uniqueCards(deck.deckCards.map((requirement) => requirement.card));
    const deckAllocationSets = assembledDecks.map((assembledDeck) => ({ assembled: true, allocations: assembledDeck.allocations } satisfies DeckAllocationSet));
    const concreteAvailabilityByCard = new Map<string, ConcreteLanguageAvailability>();
    const availabilityByCard = cards.map((card) => {
      const allowedVariants = getAllowedVariants(card);
      const ownedCounts = createOwnedVariantCounts(card.id, allowedVariants, card.collectionEntries);
      const binderReserved = getBinderReservation(card, ownedCounts, card.binderOverrides?.[0]).reserved;
      concreteAvailabilityByCard.set(card.id, buildConcreteLanguageAvailability(card, deckAllocationSets, binderReserved));

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
      const concreteAllocations = consumeConcreteLanguageAllocations(
        concreteAvailabilityByCard,
        allocation.cardId,
        allocation.variant,
        allocation.quantity,
      );

      for (const concreteAllocation of concreteAllocations) {
        await tx.deckCardAllocation.create({
          data: {
            deckId,
            cardId: allocation.cardId,
            variant: allocation.variant,
            physicalFinish: allocation.physicalFinish,
            cardLanguage: concreteAllocation.cardLanguage,
            quantity: concreteAllocation.quantity,
          },
        });
      }
    }

    await tx.deck.update({ where: { id: deckId }, data: { status: "ASSEMBLED" } });
  });
}

function uniqueCards(cards: AssemblyCardRecord[]): AssemblyCardRecord[] {
  return Array.from(new Map(cards.map((card) => [card.id, card])).values());
}

type ConcreteLanguageAvailability = Map<CardVariant, Map<CardLanguage, number>>;

function buildConcreteLanguageAvailability(
  card: AssemblyCardRecord,
  deckAllocationSets: DeckAllocationSet[],
  binderReserved: Partial<Record<CardVariant, number>>,
): ConcreteLanguageAvailability {
  const availability: ConcreteLanguageAvailability = new Map();

  for (const entry of card.collectionEntries) {
    const variant = getCollectionEntryQuantityVariant(entry);

    if (!variant || entry.quantity <= 0) {
      continue;
    }

    incrementLanguageAvailability(availability, variant, entry.cardLanguage ?? "UNKNOWN", entry.quantity);
  }

  for (const deckAllocationSet of deckAllocationSets) {
    if (!deckAllocationSet.assembled) {
      continue;
    }

    for (const allocation of deckAllocationSet.allocations) {
      if (allocation.cardId !== card.id) {
        continue;
      }

      const variant = getDeckAllocationQuantityVariant(allocation);

      if (!variant || allocation.quantity <= 0) {
        continue;
      }

      incrementLanguageAvailability(availability, variant, allocation.cardLanguage ?? "UNKNOWN", -allocation.quantity);
    }
  }

  for (const [variant, reservedQuantity] of Object.entries(binderReserved) as [CardVariant, number][]) {
    // Binder reservations are still language-agnostic. Reserve concrete rows
    // deterministically instead of inventing a language, consuming UNKNOWN first
    // to preserve legacy behavior before known-language copies.
    consumeFromConcreteAvailability(availability, variant, reservedQuantity);
  }

  return availability;
}

function getCollectionEntryQuantityVariant(
  entry: Pick<AssemblyCardRecord["collectionEntries"][number], "variant" | "physicalFinish">,
): CardVariant | null {
  if (entry.physicalFinish) {
    return entry.physicalFinish;
  }

  return entry.variant === "NORMAL" || entry.variant === "FOIL" || entry.variant === "SHOWCASE" ? entry.variant : null;
}

function incrementLanguageAvailability(
  availability: ConcreteLanguageAvailability,
  variant: CardVariant,
  cardLanguage: CardLanguage,
  quantity: number,
): void {
  const languageAvailability = availability.get(variant) ?? new Map<CardLanguage, number>();
  languageAvailability.set(cardLanguage, (languageAvailability.get(cardLanguage) ?? 0) + quantity);
  availability.set(variant, languageAvailability);
}

function consumeConcreteLanguageAllocations(
  concreteAvailabilityByCard: Map<string, ConcreteLanguageAvailability>,
  cardId: string,
  variant: CardVariant,
  quantity: number,
): { cardLanguage: CardLanguage; quantity: number }[] {
  const availability = concreteAvailabilityByCard.get(cardId);

  if (!availability) {
    throw new Error(`Deck allocation for card ${cardId} variant ${variant} cannot be backed by concrete language rows.`);
  }

  return consumeFromConcreteAvailability(availability, variant, quantity, cardId);
}

function consumeFromConcreteAvailability(
  availability: ConcreteLanguageAvailability,
  variant: CardVariant,
  quantity: number,
  cardId?: string,
): { cardLanguage: CardLanguage; quantity: number }[] {
  let remainingQuantity = quantity;
  const languageAvailability = availability.get(variant) ?? new Map<CardLanguage, number>();
  const consumed: { cardLanguage: CardLanguage; quantity: number }[] = [];

  for (const cardLanguage of LANGUAGE_ALLOCATION_ORDER) {
    const availableQuantity = Math.max(0, languageAvailability.get(cardLanguage) ?? 0);
    const consumedQuantity = Math.min(remainingQuantity, availableQuantity);

    if (consumedQuantity > 0) {
      languageAvailability.set(cardLanguage, availableQuantity - consumedQuantity);
      consumed.push({ cardLanguage, quantity: consumedQuantity });
      remainingQuantity -= consumedQuantity;
    }

    if (remainingQuantity === 0) {
      return consumed;
    }
  }

  if (cardId) {
    throw new Error(`Deck allocation for card ${cardId} variant ${variant} cannot be backed by concrete language rows; missing ${remainingQuantity} copy/copies.`);
  }

  return consumed;
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
