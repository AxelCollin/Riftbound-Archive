import type { DeckCardVariantPreference } from "@prisma/client";

import type { DeckRequirementWriteInput } from "@/lib/domain/deck-requirement-write";
import { normalizeDeckRequirementWriteInput } from "@/lib/domain/deck-requirement-write";
import { isTrackableCard } from "@/lib/domain/cards";
import type { CardGameplayType } from "@/lib/domain/card-taxonomy";
import { getAllowedVariants } from "@/lib/domain/variants";
import { prisma } from "@/lib/db";

type RequirementCard = {
  id: string;
  kind: "GAMEPLAY" | "ENERGY" | "TOKEN" | "RULES";
  gameplayType?: CardGameplayType | null;
  rarity: "COMMON" | "UNCOMMON" | "RARE" | "EPIC" | "ULTIMATE" | "UNKNOWN";
  hasShowcase: boolean;
};

type PrismaTransaction = Parameters<
  Parameters<typeof prisma.$transaction>[0]
>[0];

async function assertDeckAcceptsRequirementWrites(
  deckId: string,
  tx: Pick<PrismaTransaction, "deck"> = prisma,
): Promise<void> {
  const deck = await tx.deck.findUnique({
    where: { id: deckId },
    select: { id: true, status: true },
  });

  if (!deck) {
    throw new Error("Deck not found.");
  }

  if (deck.status !== "THEORETICAL") {
    throw new Error(
      "Deck requirements can only be edited while the deck is theoretical.",
    );
  }
}

async function getValidRequirementCard(
  cardId: string,
  preferredVariant: DeckCardVariantPreference,
  tx: Pick<PrismaTransaction, "card"> = prisma,
): Promise<RequirementCard> {
  const card = await tx.card.findUnique({
    where: { id: cardId },
    select: { id: true, kind: true, gameplayType: true, rarity: true, hasShowcase: true },
  });

  if (!card) {
    throw new Error("Card not found.");
  }

  if (!isTrackableCard(card)) {
    throw new Error(
      "Deck requirements only support trackable GAMEPLAY and ENERGY cards.",
    );
  }

  if (
    preferredVariant !== "ANY" &&
    !getAllowedVariants(card).includes(preferredVariant)
  ) {
    throw new Error(
      `Preferred variant ${preferredVariant} is not supported by the selected card.`,
    );
  }

  return card;
}

export async function addDeckRequirement(
  deckId: string,
  input: DeckRequirementWriteInput,
): Promise<void> {
  const requirement = normalizeDeckRequirementWriteInput(input);
  await prisma.$transaction(async (tx) => {
    await assertDeckAcceptsRequirementWrites(deckId, tx);
    await getValidRequirementCard(
      requirement.cardId,
      requirement.preferredVariant,
      tx,
    );

    await tx.deckCard.upsert({
      where: {
        deckId_cardId_preferredVariant: {
          deckId,
          cardId: requirement.cardId,
          preferredVariant: requirement.preferredVariant,
        },
      },
      create: {
        deckId,
        cardId: requirement.cardId,
        preferredVariant: requirement.preferredVariant,
        quantity: requirement.quantity,
      },
      update: {
        quantity: { increment: requirement.quantity },
      },
    });
  });
}

export async function updateDeckRequirement(
  deckId: string,
  deckCardId: string,
  input: DeckRequirementWriteInput,
): Promise<void> {
  const requirement = normalizeDeckRequirementWriteInput(input);

  await prisma.$transaction(async (tx) => {
    await assertDeckAcceptsRequirementWrites(deckId, tx);
    await getValidRequirementCard(
      requirement.cardId,
      requirement.preferredVariant,
      tx,
    );

    const existingRequirement = await tx.deckCard.findFirst({
      where: { id: deckCardId, deckId },
      select: { id: true },
    });

    if (!existingRequirement) {
      throw new Error("Deck requirement not found.");
    }

    const mergeTarget = await tx.deckCard.findFirst({
      where: {
        deckId,
        cardId: requirement.cardId,
        preferredVariant: requirement.preferredVariant,
        NOT: { id: deckCardId },
      },
      select: { id: true },
    });

    if (mergeTarget) {
      await tx.deckCard.update({
        where: { id: mergeTarget.id },
        data: { quantity: { increment: requirement.quantity } },
      });
      await tx.deckCard.delete({ where: { id: deckCardId } });
      return;
    }

    await tx.deckCard.update({
      where: { id: deckCardId },
      data: {
        cardId: requirement.cardId,
        preferredVariant: requirement.preferredVariant,
        quantity: requirement.quantity,
      },
    });
  });
}

export async function deleteDeckRequirement(
  deckId: string,
  deckCardId: string,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await assertDeckAcceptsRequirementWrites(deckId, tx);

    const existingRequirement = await tx.deckCard.findFirst({
      where: { id: deckCardId, deckId },
      select: { id: true },
    });

    if (!existingRequirement) {
      throw new Error("Deck requirement not found.");
    }

    await tx.deckCard.delete({ where: { id: deckCardId } });
  });
}
