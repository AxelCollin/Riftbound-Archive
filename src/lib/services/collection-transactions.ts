import { z } from "zod";
import { isTrackableCard } from "../domain/cards";
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
  hasShowcase: boolean;
};

export type RecordedCollectionTransaction = {
  id: string;
  cardId: string;
  variant: CardVariant;
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
  quantity: number;
  createdAt: Date;
  updatedAt: Date;
};

type CollectionTransactionWriteClient = {
  collectionEntry: {
    findUnique(args: { where: { cardId_variant: { cardId: string; variant: CardVariant } } }): Promise<CollectionEntrySnapshot | null>;
    upsert(args: {
      where: { cardId_variant: { cardId: string; variant: CardVariant } };
      create: { cardId: string; variant: CardVariant; quantity: number };
      update: { quantity: number };
    }): Promise<CollectionEntrySnapshot>;
  };
  collectionTransaction: {
    create(args: {
      data: {
        cardId: string;
        variant: CardVariant;
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

function getNextSnapshotQuantity(input: ValidatedCollectionTransactionInput, currentQuantity: number) {
  switch (input.type) {
    case "ADD":
      return currentQuantity + input.quantity;
    case "REMOVE":
      return currentQuantity - input.quantity;
    case "SET":
      return input.quantity;
    case "ADJUST":
      return currentQuantity + input.quantity;
  }
}

async function writeTransactionAndSnapshot(
  input: ValidatedCollectionTransactionInput,
  client: CollectionTransactionWriteClient,
): Promise<RecordedCollectionTransaction> {
  const existingEntry = await client.collectionEntry.findUnique({
    where: { cardId_variant: { cardId: input.cardId, variant: input.variant } },
  });
  const nextQuantity = getNextSnapshotQuantity(input, existingEntry?.quantity ?? 0);

  if (nextQuantity < 0) {
    throw new CollectionTransactionServiceError(
      "NEGATIVE_COLLECTION_QUANTITY",
      `Collection quantity for ${input.cardId} ${input.variant} cannot become negative`,
    );
  }

  const transaction = await client.collectionTransaction.create({
    data: {
      cardId: input.cardId,
      variant: input.variant,
      type: input.type,
      quantity: input.quantity,
      note: input.note,
      source: input.source,
    },
  });

  await client.collectionEntry.upsert({
    where: { cardId_variant: { cardId: input.cardId, variant: input.variant } },
    create: { cardId: input.cardId, variant: input.variant, quantity: nextQuantity },
    update: { quantity: nextQuantity },
  });

  return transaction;
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
