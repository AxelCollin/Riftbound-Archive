import { z } from "zod";
import { isTrackableCard } from "../domain/cards";
import type { CardCollectorCategory, CardGameplayType } from "../domain/card-taxonomy";
import { getCollectionEntryQuantityDelta } from "../domain/collection";
import type { CardLanguage } from "../domain/card-languages";
import { mapLegacyCardVariantToPhysicalFinish, type PhysicalFinish } from "../domain/physical-finishes";
import { CARD_VARIANTS, getAllowedVariants, type CardVariant } from "../domain/variants";
import { prisma } from "../db";

export const COLLECTION_TRANSACTION_TYPES = ["ADD", "REMOVE", "SET", "ADJUST"] as const;
export type CollectionTransactionType = (typeof COLLECTION_TRANSACTION_TYPES)[number];

const textFieldSchema = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value && value.length > 0 ? value : null));

export const collectionTransactionInputSchema = z
  .object({
    cardId: z.string().trim().min(1, "cardId is required"),
    variant: z.enum(CARD_VARIANTS),
    type: z.enum(COLLECTION_TRANSACTION_TYPES),
    quantity: z.number().int(),
    note: textFieldSchema,
    source: textFieldSchema,
    cardLanguage: z.enum(["FR", "EN", "ZH", "UNKNOWN"]).default("UNKNOWN"),
  })
  .superRefine((input, context) => {
    const addQuantityIssue = (message: string) => {
      context.addIssue({
        code: "custom",
        path: ["quantity"],
        message,
      });
    };

    if ((input.type === "ADD" || input.type === "REMOVE") && input.quantity <= 0) {
      addQuantityIssue(`${input.type} quantity must be a positive integer`);
    }

    if (input.type === "SET" && input.quantity < 0) {
      addQuantityIssue("SET quantity must be a non-negative integer");
    }

    if (input.type === "ADJUST" && input.quantity === 0) {
      addQuantityIssue("ADJUST quantity must be a non-zero integer");
    }
  });

export type RecordCollectionTransactionInput = z.input<typeof collectionTransactionInputSchema>;
export type ValidatedCollectionTransactionInput = z.output<typeof collectionTransactionInputSchema>;

export type CollectionTransactionServiceErrorCode =
  | "INVALID_INPUT"
  | "CARD_NOT_FOUND"
  | "UNTRACKABLE_CARD_KIND"
  | "INVALID_VARIANT_FOR_CARD"
  | "NEGATIVE_COLLECTION_QUANTITY"
  | "DATABASE_WRITE_FAILED";

export class CollectionTransactionServiceError extends Error {
  constructor(
    public readonly code: CollectionTransactionServiceErrorCode,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "CollectionTransactionServiceError";
  }
}

type CollectionTransactionCard = {
  id: string;
  name: string;
  rarity: "COMMON" | "UNCOMMON" | "RARE" | "EPIC" | "ULTIMATE" | "UNKNOWN";
  kind: "GAMEPLAY" | "ENERGY" | "TOKEN" | "RULES";
  gameplayType?: CardGameplayType | null;
  collectorCategory?: CardCollectorCategory | null;
  hasShowcase: boolean;
};

export type RecordedCollectionTransaction = {
  id: string;
  cardId: string;
  variant: CardVariant;
  physicalFinish: PhysicalFinish | null;
  cardLanguage: CardLanguage;
  type: CollectionTransactionType;
  quantity: number;
  note: string | null;
  source: string | null;
  createdAt: Date;
};

export type CollectionEntrySnapshot = {
  id: string;
  cardId: string;
  variant: CardVariant;
  physicalFinish: PhysicalFinish | null;
  cardLanguage: CardLanguage;
  quantity: number;
  createdAt: Date;
  updatedAt: Date;
};

type CollectionEntryQuantityMutation = number | { increment: number } | { decrement: number };

type CollectionTransactionWriteClient = {
  collectionEntry: {
    upsert(args: {
      where: { cardId_variant_cardLanguage: { cardId: string; variant: CardVariant; cardLanguage: CardLanguage } };
      create: { cardId: string; variant: CardVariant; physicalFinish: PhysicalFinish | null; cardLanguage: CardLanguage; quantity: number };
      update: { quantity: CollectionEntryQuantityMutation };
    }): Promise<CollectionEntrySnapshot>;
    updateMany(args: {
      where: { cardId: string; variant: CardVariant; cardLanguage: CardLanguage; quantity?: { gte: number } };
      data: { quantity: CollectionEntryQuantityMutation };
    }): Promise<{ count: number }>;
  };
  collectionTransaction: {
    create(args: {
      data: {
        cardId: string;
        variant: CardVariant;
        physicalFinish: PhysicalFinish | null;
        cardLanguage: CardLanguage;
        type: CollectionTransactionType;
        quantity: number;
        note: string | null;
        source: string | null;
      };
    }): Promise<RecordedCollectionTransaction>;
  };
};

export type CollectionTransactionRepository = CollectionTransactionWriteClient & {
  card: {
    findUnique(args: { where: { id: string } }): Promise<CollectionTransactionCard | null>;
  };
  $transaction?<T>(callback: (transactionClient: CollectionTransactionWriteClient) => Promise<T>): Promise<T>;
};

function toNegativeQuantityError(input: ValidatedCollectionTransactionInput, cause?: unknown) {
  return new CollectionTransactionServiceError(
    "NEGATIVE_COLLECTION_QUANTITY",
    `Collection quantity for ${input.cardId} ${input.variant} cannot become negative`,
    cause,
  );
}

async function writeCollectionEntrySnapshot(
  input: ValidatedCollectionTransactionInput,
  client: CollectionTransactionWriteClient,
): Promise<void> {
  const delta = getCollectionEntryQuantityDelta(input);
  const physicalFinish = mapLegacyCardVariantToPhysicalFinish(input.variant);

  if (delta === null) {
    await client.collectionEntry.upsert({
      where: { cardId_variant_cardLanguage: { cardId: input.cardId, variant: input.variant, cardLanguage: input.cardLanguage } },
      create: { cardId: input.cardId, variant: input.variant, physicalFinish, cardLanguage: input.cardLanguage, quantity: input.quantity },
      update: { quantity: input.quantity },
    });
    return;
  }

  if (delta > 0) {
    await client.collectionEntry.upsert({
      where: { cardId_variant_cardLanguage: { cardId: input.cardId, variant: input.variant, cardLanguage: input.cardLanguage } },
      create: { cardId: input.cardId, variant: input.variant, physicalFinish, cardLanguage: input.cardLanguage, quantity: delta },
      update: { quantity: { increment: delta } },
    });
    return;
  }

  const decrementAmount = Math.abs(delta);
  const updateResult = await client.collectionEntry.updateMany({
    where: {
      cardId: input.cardId,
      variant: input.variant,
      cardLanguage: input.cardLanguage,
      quantity: { gte: decrementAmount },
    },
    data: { quantity: { decrement: decrementAmount } },
  });

  if (updateResult.count !== 1) {
    throw toNegativeQuantityError(input);
  }
}

async function writeTransactionAndSnapshot(
  input: ValidatedCollectionTransactionInput,
  client: CollectionTransactionWriteClient,
): Promise<RecordedCollectionTransaction> {
  await writeCollectionEntrySnapshot(input, client);

  return client.collectionTransaction.create({
    data: {
      cardId: input.cardId,
      variant: input.variant,
      physicalFinish: mapLegacyCardVariantToPhysicalFinish(input.variant),
      cardLanguage: input.cardLanguage,
      type: input.type,
      quantity: input.quantity,
      note: input.note,
      source: input.source,
    },
  });
}

export async function recordCollectionTransaction(
  input: RecordCollectionTransactionInput,
  repository: CollectionTransactionRepository = prisma,
): Promise<RecordedCollectionTransaction> {
  const parsed = collectionTransactionInputSchema.safeParse(input);

  if (!parsed.success) {
    throw new CollectionTransactionServiceError(
      "INVALID_INPUT",
      "Collection transaction input is invalid",
      parsed.error,
    );
  }

  const card = await repository.card.findUnique({ where: { id: parsed.data.cardId } });

  if (!card) {
    throw new CollectionTransactionServiceError("CARD_NOT_FOUND", `Card ${parsed.data.cardId} was not found`);
  }

  if (!isTrackableCard(card)) {
    throw new CollectionTransactionServiceError(
      "UNTRACKABLE_CARD_KIND",
      `${card.kind} cards cannot be tracked in the collection`,
    );
  }

  const allowedVariants = getAllowedVariants(card);

  if (!allowedVariants.includes(parsed.data.variant)) {
    throw new CollectionTransactionServiceError(
      "INVALID_VARIANT_FOR_CARD",
      `${parsed.data.variant} is not allowed for card ${card.id}`,
    );
  }

  try {
    if (repository.$transaction) {
      return await repository.$transaction((transactionClient) =>
        writeTransactionAndSnapshot(parsed.data, transactionClient),
      );
    }

    return await writeTransactionAndSnapshot(parsed.data, repository);
  } catch (error) {
    if (error instanceof CollectionTransactionServiceError) {
      throw error;
    }

    throw new CollectionTransactionServiceError(
      "DATABASE_WRITE_FAILED",
      "Failed to record collection transaction and update collection snapshot",
      error,
    );
  }
}
