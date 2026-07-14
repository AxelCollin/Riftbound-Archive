import { Prisma } from "@prisma/client";
import { z } from "zod";
import { isTrackableCard } from "../domain/cards";
import type { CardCollectorCategory, CardGameplayType } from "../domain/card-taxonomy";
import { getCollectionEntryQuantityDelta } from "../domain/collection";
import { getOwnedSnapshotQuantityVariant } from "../domain/collection-quantities";
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
  | "DUPLICATE_COLLECTION_FINISH_SNAPSHOT"
  | "COLLECTION_FINISH_KEY_CONFLICT"
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

type DirectEditOperation = "ADD" | "REMOVE";

export type RecordCollectionFinishAdjustmentInput = {
  cardId: string;
  physicalFinish: PhysicalFinish;
  operation: DirectEditOperation;
  quantity: number;
  cardLanguage?: CardLanguage;
  source?: string | null;
  note?: string | null;
};

type CollectionTransactionWriteClient = {
  card: {
    findUnique(args: { where: { id: string } }): Promise<CollectionTransactionCard | null>;
  };
  collectionEntry: {
    upsert(args: {
      where: { cardId_variant_cardLanguage: { cardId: string; variant: CardVariant; cardLanguage: CardLanguage } };
      create: { cardId: string; variant: CardVariant; physicalFinish: PhysicalFinish | null; cardLanguage: CardLanguage; quantity: number };
      update: { quantity: CollectionEntryQuantityMutation };
    }): Promise<CollectionEntrySnapshot>;
    findMany?(args: {
      where: { cardId: string; cardLanguage: CardLanguage };
      select?: { id: true; cardId: true; variant: true; physicalFinish: true; cardLanguage: true; quantity: true; createdAt: true; updatedAt: true };
    }): Promise<CollectionEntrySnapshot[]>;
    findUnique(args: {
      where: { cardId_variant_cardLanguage: { cardId: string; variant: CardVariant; cardLanguage: CardLanguage } };
    }): Promise<CollectionEntrySnapshot | null>;
    create(args: {
      data: { cardId: string; variant: CardVariant; physicalFinish: PhysicalFinish | null; cardLanguage: CardLanguage; quantity: number };
    }): Promise<CollectionEntrySnapshot>;
    update(args: {
      where: { cardId_variant_cardLanguage: { cardId: string; variant: CardVariant; cardLanguage: CardLanguage } };
      data: { physicalFinish?: PhysicalFinish | null; quantity: CollectionEntryQuantityMutation };
    }): Promise<CollectionEntrySnapshot>;
    updateMany(args: {
      where: {
        cardId: string;
        variant: CardVariant;
        cardLanguage: CardLanguage;
        quantity?: number | { gte: number };
        physicalFinish?: PhysicalFinish | null;
      };
      data: { physicalFinish?: PhysicalFinish | null; quantity: CollectionEntryQuantityMutation };
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


function assertEditableFinish(physicalFinish: PhysicalFinish): asserts physicalFinish is "NORMAL" | "FOIL" {
  if (physicalFinish !== "NORMAL" && physicalFinish !== "FOIL") {
    throw new CollectionTransactionServiceError(
      "INVALID_INPUT",
      `${physicalFinish} is not editable through direct collection editing`,
    );
  }
}

function toFinishAdjustmentNegativeQuantityError(input: RecordCollectionFinishAdjustmentInput, cause?: unknown) {
  return new CollectionTransactionServiceError(
    "NEGATIVE_COLLECTION_QUANTITY",
    `Collection quantity for ${input.cardId} ${input.physicalFinish} cannot become negative`,
    cause,
  );
}


function isPrismaUniqueConstraintError(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

function toCollectionFinishKeyConflict(input: { cardId: string; physicalFinish: PhysicalFinish }, message: string, cause?: unknown) {
  return new CollectionTransactionServiceError(
    "COLLECTION_FINISH_KEY_CONFLICT",
    message,
    cause,
  );
}

function createFinishAdjustmentTransaction(
  input: Required<Pick<RecordCollectionFinishAdjustmentInput, "cardId" | "physicalFinish" | "operation" | "quantity" | "cardLanguage">> & Pick<RecordCollectionFinishAdjustmentInput, "source" | "note">,
  client: CollectionTransactionWriteClient,
  variant: CardVariant,
): Promise<RecordedCollectionTransaction> {
  return client.collectionTransaction.create({
    data: {
      cardId: input.cardId,
      variant,
      physicalFinish: input.physicalFinish,
      cardLanguage: input.cardLanguage,
      type: input.operation,
      quantity: input.quantity,
      note: input.note ?? null,
      source: input.source ?? null,
    },
  });
}

async function retryCanonicalCreateRace(
  input: Required<Pick<RecordCollectionFinishAdjustmentInput, "cardId" | "physicalFinish" | "operation" | "quantity" | "cardLanguage">> & Pick<RecordCollectionFinishAdjustmentInput, "source" | "note">,
  client: CollectionTransactionWriteClient,
  canonicalLegacyVariant: CardVariant,
): Promise<RecordedCollectionTransaction> {
  const snapshot = await client.collectionEntry.findUnique({
    where: {
      cardId_variant_cardLanguage: {
        cardId: input.cardId,
        variant: canonicalLegacyVariant,
        cardLanguage: input.cardLanguage,
      },
    },
  });

  if (!snapshot) {
    throw toCollectionFinishKeyConflict(
      input,
      `Cannot create ${input.physicalFinish} CollectionEntry for card ${input.cardId} because its legacy storage key was unavailable after a create race`,
    );
  }

  const effectiveFinish = getOwnedSnapshotQuantityVariant(snapshot);

  if (effectiveFinish === input.physicalFinish) {
    return addToExistingFinishSnapshot(input, client, snapshot);
  }

  if (snapshot.quantity > 0) {
    throw toCollectionFinishKeyConflict(
      input,
      `Cannot create ${input.physicalFinish} CollectionEntry for card ${input.cardId} because its legacy storage key is occupied by ${effectiveFinish ?? "an unmapped"} effective finish`,
    );
  }

  return reuseZeroQuantityFinishSnapshot(input, client, snapshot, "retry");
}

async function addToExistingFinishSnapshot(
  input: Required<Pick<RecordCollectionFinishAdjustmentInput, "cardId" | "physicalFinish" | "operation" | "quantity" | "cardLanguage">> & Pick<RecordCollectionFinishAdjustmentInput, "source" | "note">,
  client: CollectionTransactionWriteClient,
  snapshot: CollectionEntrySnapshot,
): Promise<RecordedCollectionTransaction> {
  const updateResult = await client.collectionEntry.updateMany({
    where: {
      cardId: input.cardId,
      variant: snapshot.variant,
      cardLanguage: input.cardLanguage,
      physicalFinish: snapshot.physicalFinish,
    },
    data: {
      physicalFinish: input.physicalFinish,
      quantity: { increment: input.quantity },
    },
  });

  if (updateResult.count !== 1) {
    throw toCollectionFinishKeyConflict(
      input,
      `Cannot add ${input.physicalFinish} CollectionEntry for card ${input.cardId} because its legacy storage key changed before update`,
    );
  }

  return createFinishAdjustmentTransaction(input, client, snapshot.variant);
}

async function reuseZeroQuantityFinishSnapshot(
  input: Required<Pick<RecordCollectionFinishAdjustmentInput, "cardId" | "physicalFinish" | "operation" | "quantity" | "cardLanguage">> & Pick<RecordCollectionFinishAdjustmentInput, "source" | "note">,
  client: CollectionTransactionWriteClient,
  snapshot: CollectionEntrySnapshot,
  conflictContext: "update" | "retry",
): Promise<RecordedCollectionTransaction> {
  const updateResult = await client.collectionEntry.updateMany({
    where: {
      cardId: input.cardId,
      variant: snapshot.variant,
      cardLanguage: input.cardLanguage,
      quantity: 0,
      physicalFinish: snapshot.physicalFinish,
    },
    data: {
      physicalFinish: input.physicalFinish,
      quantity: { increment: input.quantity },
    },
  });

  if (updateResult.count !== 1) {
    throw toCollectionFinishKeyConflict(
      input,
      `Cannot reuse ${input.physicalFinish} CollectionEntry for card ${input.cardId} because its legacy storage key changed before ${conflictContext}`,
    );
  }

  return createFinishAdjustmentTransaction(input, client, snapshot.variant);
}

async function writeFinishAdjustmentTransactionAndSnapshot(
  input: Required<Pick<RecordCollectionFinishAdjustmentInput, "cardId" | "physicalFinish" | "operation" | "quantity" | "cardLanguage">> & Pick<RecordCollectionFinishAdjustmentInput, "source" | "note">,
  client: CollectionTransactionWriteClient,
): Promise<RecordedCollectionTransaction> {
  const card = await client.card.findUnique({ where: { id: input.cardId } });

  if (!card) {
    throw new CollectionTransactionServiceError("CARD_NOT_FOUND", `Card ${input.cardId} was not found`);
  }

  if (!isTrackableCard(card)) {
    throw new CollectionTransactionServiceError(
      "UNTRACKABLE_CARD_KIND",
      `${card.kind} cards cannot be tracked in the collection`,
    );
  }

  const allowedVariants = getAllowedVariants(card);

  if (!allowedVariants.includes(input.physicalFinish)) {
    throw new CollectionTransactionServiceError(
      "INVALID_VARIANT_FOR_CARD",
      `${input.physicalFinish} is not allowed for card ${card.id}`,
    );
  }

  if (!client.collectionEntry.findMany) {
    throw new CollectionTransactionServiceError(
      "DATABASE_WRITE_FAILED",
      "Collection repository does not support finish-aware direct editing",
    );
  }

  const unknownSnapshots = await client.collectionEntry.findMany({
    where: { cardId: input.cardId, cardLanguage: input.cardLanguage },
    select: { id: true, cardId: true, variant: true, physicalFinish: true, cardLanguage: true, quantity: true, createdAt: true, updatedAt: true },
  });
  const matchingSnapshots = unknownSnapshots.filter(
    (snapshot) => getOwnedSnapshotQuantityVariant(snapshot) === input.physicalFinish,
  );

  if (matchingSnapshots.length > 1) {
    throw new CollectionTransactionServiceError(
      "DUPLICATE_COLLECTION_FINISH_SNAPSHOT",
      `Multiple UNKNOWN CollectionEntry snapshots resolve to ${input.physicalFinish} for card ${input.cardId}`,
    );
  }

  const existingSnapshot = matchingSnapshots[0];
  const type: CollectionTransactionType = input.operation;

  if (existingSnapshot) {
    if (input.operation === "ADD") {
      return addToExistingFinishSnapshot(input, client, existingSnapshot);
    } else {
      if (existingSnapshot.quantity < input.quantity) {
        throw toFinishAdjustmentNegativeQuantityError(input);
      }

      const updateResult = await client.collectionEntry.updateMany({
        where: {
          cardId: input.cardId,
          variant: existingSnapshot.variant,
          cardLanguage: input.cardLanguage,
          quantity: { gte: input.quantity },
          physicalFinish: existingSnapshot.physicalFinish,
        },
        data: {
          physicalFinish: input.physicalFinish,
          quantity: { decrement: input.quantity },
        },
      });

      if (updateResult.count !== 1) {
        throw toFinishAdjustmentNegativeQuantityError(input);
      }
    }

    return client.collectionTransaction.create({
      data: {
        cardId: input.cardId,
        variant: existingSnapshot.variant,
        physicalFinish: input.physicalFinish,
        cardLanguage: input.cardLanguage,
        type,
        quantity: input.quantity,
        note: input.note ?? null,
        source: input.source ?? null,
      },
    });
  }

  if (input.operation === "REMOVE") {
    throw toFinishAdjustmentNegativeQuantityError(input);
  }

  const canonicalLegacyVariant = input.physicalFinish;
  const occupiedCanonicalSnapshot = unknownSnapshots.find(
    (snapshot) => snapshot.variant === canonicalLegacyVariant,
  );

  if (occupiedCanonicalSnapshot) {
    const occupiedEffectiveFinish = getOwnedSnapshotQuantityVariant(occupiedCanonicalSnapshot);

    if (occupiedEffectiveFinish === input.physicalFinish) {
      return addToExistingFinishSnapshot(input, client, occupiedCanonicalSnapshot);
    }

    if (occupiedCanonicalSnapshot.quantity > 0) {
      throw new CollectionTransactionServiceError(
        "COLLECTION_FINISH_KEY_CONFLICT",
        `Cannot create ${input.physicalFinish} CollectionEntry for card ${input.cardId} because its legacy storage key is occupied by ${occupiedEffectiveFinish ?? "an unmapped"} effective finish`,
      );
    }

    return reuseZeroQuantityFinishSnapshot(input, client, occupiedCanonicalSnapshot, "update");
  }

  try {
    await client.collectionEntry.create({
      data: {
        cardId: input.cardId,
        variant: canonicalLegacyVariant,
        physicalFinish: input.physicalFinish,
        cardLanguage: input.cardLanguage,
        quantity: input.quantity,
      },
    });
  } catch (error) {
    if (isPrismaUniqueConstraintError(error)) {
      return retryCanonicalCreateRace(input, client, canonicalLegacyVariant);
    }

    throw new CollectionTransactionServiceError(
      "DATABASE_WRITE_FAILED",
      `Failed to create ${input.physicalFinish} CollectionEntry for card ${input.cardId}`,
      error,
    );
  }

  return createFinishAdjustmentTransaction(input, client, input.physicalFinish);
}

export async function recordCollectionFinishAdjustment(
  input: RecordCollectionFinishAdjustmentInput,
  repository: CollectionTransactionRepository = prisma,
): Promise<RecordedCollectionTransaction> {
  const normalized = {
    ...input,
    cardLanguage: input.cardLanguage ?? "UNKNOWN",
    source: input.source?.trim() ? input.source.trim() : null,
    note: input.note?.trim() ? input.note.trim() : null,
  };

  assertEditableFinish(normalized.physicalFinish);

  if (!normalized.cardId.trim() || (normalized.operation !== "ADD" && normalized.operation !== "REMOVE") || normalized.quantity <= 0) {
    throw new CollectionTransactionServiceError("INVALID_INPUT", "Collection finish adjustment input is invalid");
  }

  if (normalized.cardLanguage !== "UNKNOWN") {
    throw new CollectionTransactionServiceError(
      "INVALID_INPUT",
      "Direct collection editing only supports UNKNOWN-language snapshots",
    );
  }

  try {
    if (repository.$transaction) {
      return await repository.$transaction((transactionClient) =>
        writeFinishAdjustmentTransactionAndSnapshot(normalized, transactionClient),
      );
    }

    return await writeFinishAdjustmentTransactionAndSnapshot(normalized, repository);
  } catch (error) {
    if (error instanceof CollectionTransactionServiceError) {
      throw error;
    }

    throw new CollectionTransactionServiceError(
      "DATABASE_WRITE_FAILED",
      "Failed to record collection finish adjustment and update collection snapshot",
      error,
    );
  }
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
