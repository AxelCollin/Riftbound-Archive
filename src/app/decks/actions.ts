"use server";

import type { DeckAllocationStrategy } from "@prisma/client";
import { redirect } from "next/navigation";

import { DEFAULT_DECK_ALLOCATION_STRATEGY } from "@/lib/domain/deck-write";
import { createDeck, deleteDeck, updateDeck } from "@/lib/services/decks";

function getDeckMetadataFormInput(formData: FormData) {
  return {
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? ""),
    allocationStrategy: String(formData.get("allocationStrategy") ?? DEFAULT_DECK_ALLOCATION_STRATEGY) as DeckAllocationStrategy,
  };
}

export async function createDeckAction(formData: FormData): Promise<void> {
  await createDeck(getDeckMetadataFormInput(formData));
  redirect("/decks");
}

export async function updateDeckAction(deckId: string, formData: FormData): Promise<void> {
  await updateDeck(deckId, getDeckMetadataFormInput(formData));
  redirect("/decks");
}

export async function deleteDeckAction(deckId: string): Promise<void> {
  await deleteDeck(deckId);
  redirect("/decks");
}
