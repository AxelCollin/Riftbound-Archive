import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  CollectionTransactionServiceError,
  recordCollectionTransaction,
  type CollectionEntrySnapshot,
  type CollectionTransactionRepository,
} from "./collection-transactions";

type TestCard = Awaited<ReturnType<CollectionTransactionRepository["card"]["findUnique"]>>;

const baseCard = {
  id: "card-common",
  name: "Archiviste de test",
  rarity: "COMMON" as const,
  kind: "GAMEPLAY" as const,
  hasShowcase: false,
};

function createEntry(quantity: number, cardId = "card-common", variant = "NORMAL" as const): CollectionEntrySnapshot {
  return {
    id: `entry-${cardId}-${variant}`,
    cardId,
    variant,
    quantity,
    createdAt: new Date("2026-06-28T00:00:00.000Z"),
    updatedAt: new Date("2026-06-28T00:00:00.000Z"),
  };
}

function createRepository(card: TestCard = baseCard, initialEntries: CollectionEntrySnapshot[] = []) {
  const transactions: unknown[] = [];
  const entries = new Map(initialEntries.map((entry) => [`${entry.cardId}:${entry.variant}`, entry]));
  const findUniqueEntry = vi.fn(async ({ where: { cardId_variant } }) => {
    return entries.get(`${cardId_variant.cardId}:${cardId_variant.variant}`) ?? null;
  });
  const applyQuantityMutation = (currentQuantity: number, mutation: number | { increment: number } | { decrement: number }) => {
    if (typeof mutation === "number") {
      return mutation;
    }

    if ("increment" in mutation) {
      return currentQuantity + mutation.increment;
    }

    return currentQuantity - mutation.decrement;
  };
  const upsertEntry = vi.fn(async ({ where: { cardId_variant }, create, update }) => {
    const key = `${cardId_variant.cardId}:${cardId_variant.variant}`;
    const existing = entries.get(key);
    const entry = existing
      ? {
          ...existing,
          quantity: applyQuantityMutation(existing.quantity, update.quantity),
          updatedAt: new Date("2026-06-28T00:00:01.000Z"),
        }
      : createEntry(create.quantity, create.cardId, create.variant);

    entries.set(key, entry);
    return entry;
  });
  const updateManyEntry = vi.fn(async ({ where, data }) => {
    const key = `${where.cardId}:${where.variant}`;
    const existing = entries.get(key);

    if (!existing || (where.quantity?.gte !== undefined && existing.quantity < where.quantity.gte)) {
      return { count: 0 };
    }

    entries.set(key, {
      ...existing,
      quantity: applyQuantityMutation(existing.quantity, data.quantity),
      updatedAt: new Date("2026-06-28T00:00:01.000Z"),
    });
    return { count: 1 };
  });

  const repository: CollectionTransactionRepository = {
    card: {
      findUnique: vi.fn(async () => card),
    },
    collectionEntry: {
      findUnique: findUniqueEntry,
      upsert: upsertEntry,
      updateMany: updateManyEntry,
    },
    collectionTransaction: {
      create: vi.fn(async ({ data }) => {
        transactions.push(data);
        return {
          id: `transaction-${transactions.length}`,
          ...data,
          createdAt: new Date("2026-06-28T00:00:00.000Z"),
        };
      }),
    },
  };

  return { repository, transactions, entries };
}

async function expectServiceError(
  input: Parameters<typeof recordCollectionTransaction>[0],
  code: CollectionTransactionServiceError["code"],
  repository = createRepository().repository,
) {
  await expect(recordCollectionTransaction(input, repository)).rejects.toMatchObject({ code });
}

describe("recordCollectionTransaction", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("records an ADD transaction for a trackable GAMEPLAY card and creates a CollectionEntry", async () => {
    const { repository, entries } = createRepository(baseCard);

    const transaction = await recordCollectionTransaction(
      {
        cardId: "card-common",
        variant: "NORMAL",
        type: "ADD",
        quantity: 2,
        note: "  Première acquisition  ",
        source: "  Boutique locale  ",
      },
      repository,
    );

    expect(transaction).toMatchObject({
      cardId: "card-common",
      variant: "NORMAL",
      type: "ADD",
      quantity: 2,
      note: "Première acquisition",
      source: "Boutique locale",
    });
    expect(entries.get("card-common:NORMAL")?.quantity).toBe(2);
    expect(repository.collectionTransaction.create).toHaveBeenCalledTimes(1);
    expect(repository.collectionEntry.upsert).toHaveBeenCalledTimes(1);
    expect(repository.collectionEntry.upsert).toHaveBeenCalledWith({
      where: { cardId_variant: { cardId: "card-common", variant: "NORMAL" } },
      create: { cardId: "card-common", variant: "NORMAL", quantity: 2 },
      update: { quantity: { increment: 2 } },
    });
  });

  it("increments an existing CollectionEntry for ADD", async () => {
    const { repository, entries } = createRepository(baseCard, [createEntry(3)]);

    await recordCollectionTransaction({ cardId: "card-common", variant: "NORMAL", type: "ADD", quantity: 2 }, repository);

    expect(entries.get("card-common:NORMAL")?.quantity).toBe(5);
  });

  it("uses an atomic increment mutation for ADD snapshots", async () => {
    const { repository } = createRepository(baseCard, [createEntry(3)]);

    await recordCollectionTransaction({ cardId: "card-common", variant: "NORMAL", type: "ADD", quantity: 2 }, repository);

    expect(repository.collectionEntry.findUnique).not.toHaveBeenCalled();
    expect(repository.collectionEntry.upsert).toHaveBeenCalledWith({
      where: { cardId_variant: { cardId: "card-common", variant: "NORMAL" } },
      create: { cardId: "card-common", variant: "NORMAL", quantity: 2 },
      update: { quantity: { increment: 2 } },
    });
  });

  it("decrements an existing CollectionEntry for REMOVE", async () => {
    const { repository, entries } = createRepository(baseCard, [createEntry(3)]);

    await recordCollectionTransaction({ cardId: "card-common", variant: "NORMAL", type: "REMOVE", quantity: 2 }, repository);

    expect(entries.get("card-common:NORMAL")?.quantity).toBe(1);
  });

  it("rejects REMOVE if it would make quantity negative", async () => {
    const { repository, entries, transactions } = createRepository(baseCard, [createEntry(1)]);

    await expectServiceError(
      { cardId: "card-common", variant: "NORMAL", type: "REMOVE", quantity: 2 },
      "NEGATIVE_COLLECTION_QUANTITY",
      repository,
    );

    expect(transactions).toHaveLength(0);
    expect(entries.get("card-common:NORMAL")?.quantity).toBe(1);
    expect(repository.collectionEntry.updateMany).toHaveBeenCalledWith({
      where: { cardId: "card-common", variant: "NORMAL", quantity: { gte: 2 } },
      data: { quantity: { decrement: 2 } },
    });
    expect(repository.collectionEntry.upsert).not.toHaveBeenCalled();
  });

  it("rejects REMOVE when no CollectionEntry exists", async () => {
    const { repository, transactions } = createRepository(baseCard);

    await expectServiceError(
      { cardId: "card-common", variant: "NORMAL", type: "REMOVE", quantity: 1 },
      "NEGATIVE_COLLECTION_QUANTITY",
      repository,
    );

    expect(transactions).toHaveLength(0);
    expect(repository.collectionEntry.updateMany).toHaveBeenCalledWith({
      where: { cardId: "card-common", variant: "NORMAL", quantity: { gte: 1 } },
      data: { quantity: { decrement: 1 } },
    });
  });

  it("creates or updates a CollectionEntry to the exact SET quantity", async () => {
    const created = createRepository(baseCard);
    await recordCollectionTransaction({ cardId: "card-common", variant: "NORMAL", type: "SET", quantity: 4 }, created.repository);
    expect(created.entries.get("card-common:NORMAL")?.quantity).toBe(4);

    const updated = createRepository(baseCard, [createEntry(9)]);
    await recordCollectionTransaction({ cardId: "card-common", variant: "NORMAL", type: "SET", quantity: 4 }, updated.repository);
    expect(updated.entries.get("card-common:NORMAL")?.quantity).toBe(4);
  });

  it("accepts SET with quantity 0 and sets snapshot quantity to 0", async () => {
    const { repository, entries } = createRepository(baseCard, [createEntry(3)]);

    await expect(
      recordCollectionTransaction({ cardId: "card-common", variant: "NORMAL", type: "SET", quantity: 0 }, repository),
    ).resolves.toMatchObject({ type: "SET", quantity: 0 });

    expect(entries.get("card-common:NORMAL")?.quantity).toBe(0);
  });

  it("increments an existing CollectionEntry for positive ADJUST", async () => {
    const { repository, entries } = createRepository(baseCard, [createEntry(3)]);

    await recordCollectionTransaction({ cardId: "card-common", variant: "NORMAL", type: "ADJUST", quantity: 2 }, repository);

    expect(entries.get("card-common:NORMAL")?.quantity).toBe(5);
  });

  it("decrements an existing CollectionEntry for negative ADJUST", async () => {
    const { repository, entries } = createRepository(baseCard, [createEntry(3)]);

    await recordCollectionTransaction({ cardId: "card-common", variant: "NORMAL", type: "ADJUST", quantity: -2 }, repository);

    expect(entries.get("card-common:NORMAL")?.quantity).toBe(1);
  });

  it("rejects ADJUST if it would make quantity negative", async () => {
    const { repository, entries, transactions } = createRepository(baseCard, [createEntry(1)]);

    await expectServiceError(
      { cardId: "card-common", variant: "NORMAL", type: "ADJUST", quantity: -2 },
      "NEGATIVE_COLLECTION_QUANTITY",
      repository,
    );

    expect(transactions).toHaveLength(0);
    expect(entries.get("card-common:NORMAL")?.quantity).toBe(1);
    expect(repository.collectionEntry.updateMany).toHaveBeenCalledWith({
      where: { cardId: "card-common", variant: "NORMAL", quantity: { gte: 2 } },
      data: { quantity: { decrement: 2 } },
    });
    expect(repository.collectionEntry.upsert).not.toHaveBeenCalled();
  });

  it("records an ADD transaction for an ENERGY card", async () => {
    const { repository, entries } = createRepository({ ...baseCard, id: "energy", kind: "ENERGY" });

    await expect(
      recordCollectionTransaction({ cardId: "energy", variant: "NORMAL", type: "ADD", quantity: 1 }, repository),
    ).resolves.toMatchObject({ cardId: "energy", variant: "NORMAL" });
    expect(entries.get("energy:NORMAL")?.quantity).toBe(1);
  });

  it("rejects TOKEN card transactions without writing transaction or snapshot", async () => {
    const { repository } = createRepository({ ...baseCard, kind: "TOKEN" });

    await expectServiceError(
      { cardId: "token", variant: "NORMAL", type: "ADD", quantity: 1 },
      "UNTRACKABLE_CARD_KIND",
      repository,
    );
    expect(repository.collectionTransaction.create).not.toHaveBeenCalled();
    expect(repository.collectionEntry.upsert).not.toHaveBeenCalled();
  });

  it("rejects RULES card transactions without writing transaction or snapshot", async () => {
    const { repository } = createRepository({ ...baseCard, kind: "RULES" });

    await expectServiceError(
      { cardId: "rules", variant: "NORMAL", type: "ADD", quantity: 1 },
      "UNTRACKABLE_CARD_KIND",
      repository,
    );
    expect(repository.collectionTransaction.create).not.toHaveBeenCalled();
    expect(repository.collectionEntry.upsert).not.toHaveBeenCalled();
  });

  it("accepts NORMAL for COMMON cards", async () => {
    const { repository } = createRepository({ ...baseCard, rarity: "COMMON" });

    await expect(
      recordCollectionTransaction({ cardId: "common", variant: "NORMAL", type: "ADD", quantity: 1 }, repository),
    ).resolves.toMatchObject({ variant: "NORMAL" });
  });

  it("accepts FOIL for higher-rarity cards", async () => {
    const { repository } = createRepository({ ...baseCard, rarity: "RARE" });

    await expect(
      recordCollectionTransaction({ cardId: "rare", variant: "FOIL", type: "ADD", quantity: 1 }, repository),
    ).resolves.toMatchObject({ variant: "FOIL" });
  });

  it("rejects NORMAL for higher-rarity cards without writing transaction or snapshot", async () => {
    const { repository } = createRepository({ ...baseCard, rarity: "RARE" });

    await expectServiceError(
      { cardId: "rare", variant: "NORMAL", type: "ADD", quantity: 1 },
      "INVALID_VARIANT_FOR_CARD",
      repository,
    );
    expect(repository.collectionTransaction.create).not.toHaveBeenCalled();
    expect(repository.collectionEntry.upsert).not.toHaveBeenCalled();
  });

  it("rejects SHOWCASE when hasShowcase is false", async () => {
    const { repository } = createRepository({ ...baseCard, hasShowcase: false });

    await expectServiceError({ cardId: "common", variant: "SHOWCASE", type: "ADD", quantity: 1 }, "INVALID_VARIANT_FOR_CARD", repository);
  });

  it("accepts SHOWCASE when hasShowcase is true", async () => {
    const { repository } = createRepository({ ...baseCard, hasShowcase: true });

    await expect(
      recordCollectionTransaction({ cardId: "showcase", variant: "SHOWCASE", type: "ADD", quantity: 1 }, repository),
    ).resolves.toMatchObject({ variant: "SHOWCASE" });
  });

  it("rejects ADD with quantity 0", async () => {
    await expectServiceError({ cardId: "card-common", variant: "NORMAL", type: "ADD", quantity: 0 }, "INVALID_INPUT");
  });

  it("rejects REMOVE with negative quantity", async () => {
    await expectServiceError({ cardId: "card-common", variant: "NORMAL", type: "REMOVE", quantity: -1 }, "INVALID_INPUT");
  });

  it("rejects ADJUST with quantity 0", async () => {
    await expectServiceError({ cardId: "card-common", variant: "NORMAL", type: "ADJUST", quantity: 0 }, "INVALID_INPUT");
  });

  it("uses repository transactions to keep the history write and snapshot update atomic", async () => {
    const { repository } = createRepository(baseCard, [createEntry(2)]);
    const transactionMock = vi.fn(async (callback) => callback(repository));
    const transactionalRepository = { ...repository, $transaction: transactionMock } satisfies CollectionTransactionRepository;

    await recordCollectionTransaction({ cardId: "card-common", variant: "NORMAL", type: "ADD", quantity: 1 }, transactionalRepository);

    expect(transactionMock).toHaveBeenCalledTimes(1);
    expect(repository.collectionTransaction.create).toHaveBeenCalledTimes(1);
    expect(repository.collectionEntry.upsert).toHaveBeenCalledTimes(1);
  });

  it("wraps snapshot update failures as database write failures in the real repository path", async () => {
    const { repository } = createRepository(baseCard, [createEntry(2)]);
    repository.collectionEntry.upsert = vi.fn(async () => {
      throw new Error("snapshot update failed");
    });

    await expectServiceError(
      { cardId: "card-common", variant: "NORMAL", type: "ADD", quantity: 1 },
      "DATABASE_WRITE_FAILED",
      repository,
    );
  });

  it("keeps CollectionTransaction append-only by creating a new transaction for every valid write", async () => {
    const { repository, transactions } = createRepository(baseCard, [createEntry(1)]);

    await recordCollectionTransaction({ cardId: "card-common", variant: "NORMAL", type: "ADD", quantity: 1 }, repository);
    await recordCollectionTransaction({ cardId: "card-common", variant: "NORMAL", type: "SET", quantity: 1 }, repository);

    expect(transactions).toHaveLength(2);
    expect(repository.collectionTransaction.create).toHaveBeenCalledTimes(2);
  });
});
