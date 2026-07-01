import type { DeckMetadataInput } from "@/lib/domain/deck-write";
import { normalizeDeckMetadataInput } from "@/lib/domain/deck-write";
import { prisma } from "@/lib/db";

export async function createDeck(input: DeckMetadataInput): Promise<{ deckId: string }> {
  const metadata = normalizeDeckMetadataInput(input);
  const deck = await prisma.deck.create({
    data: {
      name: metadata.name,
      description: metadata.description,
      allocationStrategy: metadata.allocationStrategy,
      status: "THEORETICAL",
    },
    select: { id: true },
  });

  return { deckId: deck.id };
}

export async function updateDeck(deckId: string, input: DeckMetadataInput): Promise<void> {
  const metadata = normalizeDeckMetadataInput(input);
  await prisma.deck.update({
    where: { id: deckId },
    data: {
      name: metadata.name,
      description: metadata.description,
      allocationStrategy: metadata.allocationStrategy,
    },
  });
}

export async function deleteDeck(deckId: string): Promise<void> {
  await prisma.deck.delete({ where: { id: deckId } });
}
