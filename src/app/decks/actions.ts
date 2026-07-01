"use server";

import type { DeckAllocationStrategy, DeckCardVariantPreference } from "@prisma/client";
import { redirect } from "next/navigation";

import { DEFAULT_DECK_ALLOCATION_STRATEGY } from "@/lib/domain/deck-write";
import { createDeck, deleteDeck, updateDeck } from "@/lib/services/decks";
import { addDeckRequirement, deleteDeckRequirement, updateDeckRequirement } from "@/lib/services/deck-requirements";

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


function getDeckRequirementFormInput(formData: FormData) {
  return {
    cardId: String(formData.get("cardId") ?? ""),
    quantity: Number(formData.get("quantity") ?? 0),
    preferredVariant: String(formData.get("preferredVariant") ?? "ANY") as DeckCardVariantPreference,
  };
}

function redirectToDeckDetail(deckId: string): never {
  redirect(`/decks/${encodeURIComponent(deckId)}`);
}

export async function addDeckRequirementAction(deckId: string, formData: FormData): Promise<void> {
  await addDeckRequirement(deckId, getDeckRequirementFormInput(formData));
  redirectToDeckDetail(deckId);
}

export async function updateDeckRequirementAction(deckId: string, deckCardId: string, formData: FormData): Promise<void> {
  await updateDeckRequirement(deckId, deckCardId, getDeckRequirementFormInput(formData));
  redirectToDeckDetail(deckId);
}

export async function deleteDeckRequirementAction(deckId: string, deckCardId: string): Promise<void> {
  await deleteDeckRequirement(deckId, deckCardId);
  redirectToDeckDetail(deckId);
}
