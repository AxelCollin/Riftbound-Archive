import { prisma } from "../db";

export const CARD_NOTE_MAX_LENGTH = 5000;

export type CardUserMetaServiceErrorCode = "INVALID_INPUT" | "CARD_NOT_FOUND" | "NOTE_TOO_LONG" | "DATABASE_WRITE_FAILED";

export class CardUserMetaServiceError extends Error {
  constructor(public readonly code: CardUserMetaServiceErrorCode, message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "CardUserMetaServiceError";
  }
}

type CardUserMetaRepository = {
  card: { findUnique(args: { where: { id: string }; select: { id: true } }): Promise<{ id: string } | null> };
  cardUserMeta: {
    upsert(args: {
      where: { cardId: string };
      create: { cardId: string; favorite?: boolean; note?: string | null };
      update: { favorite?: boolean; note?: string | null };
      select: { cardId: true; favorite: true; note: true };
    }): Promise<{ cardId: string; favorite: boolean; note: string | null }>;
  };
};

export type CardUserMetaResult = { cardId: string; favorite: boolean; note: string | null };

async function assertCardExists(cardId: string, repository: CardUserMetaRepository) {
  const normalizedCardId = cardId.trim();
  if (!normalizedCardId) throw new CardUserMetaServiceError("INVALID_INPUT", "Identifiant de carte invalide.");
  const card = await repository.card.findUnique({ where: { id: normalizedCardId }, select: { id: true } });
  if (!card) throw new CardUserMetaServiceError("CARD_NOT_FOUND", `Carte ${normalizedCardId} introuvable.`);
  return normalizedCardId;
}

export async function setCardFavorite(input: { cardId: string; favorite: boolean }, repository: CardUserMetaRepository = prisma): Promise<CardUserMetaResult> {
  try {
    const cardId = await assertCardExists(input.cardId, repository);
    return await repository.cardUserMeta.upsert({
      where: { cardId },
      create: { cardId, favorite: input.favorite },
      update: { favorite: input.favorite },
      select: { cardId: true, favorite: true, note: true },
    });
  } catch (error) {
    if (error instanceof CardUserMetaServiceError) throw error;
    throw new CardUserMetaServiceError("DATABASE_WRITE_FAILED", "Impossible d’enregistrer le favori local.", error);
  }
}

export async function setCardNote(input: { cardId: string; note: string }, repository: CardUserMetaRepository = prisma): Promise<CardUserMetaResult> {
  const note = input.note.trim();
  if (note.length > CARD_NOTE_MAX_LENGTH) {
    throw new CardUserMetaServiceError("NOTE_TOO_LONG", `La note locale ne peut pas dépasser ${CARD_NOTE_MAX_LENGTH} caractères.`);
  }
  try {
    const cardId = await assertCardExists(input.cardId, repository);
    return await repository.cardUserMeta.upsert({
      where: { cardId },
      create: { cardId, note: note.length > 0 ? note : null },
      update: { note: note.length > 0 ? note : null },
      select: { cardId: true, favorite: true, note: true },
    });
  } catch (error) {
    if (error instanceof CardUserMetaServiceError) throw error;
    throw new CardUserMetaServiceError("DATABASE_WRITE_FAILED", "Impossible d’enregistrer la note locale.", error);
  }
}
