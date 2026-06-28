import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  CollectionTransactionServiceError,
  recordCollectionTransaction,
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

function createRepository(card: TestCard = baseCard) {
  const transactions: unknown[] = [];
  const repository: CollectionTransactionRepository = {
    card: {
      findUnique: vi.fn(async () => card),
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

  return { repository, transactions };
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

  it("records an ADD transaction for a trackable GAMEPLAY card", async () => {
    const { repository } = createRepository(baseCard);

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
    expect(repository.collectionTransaction.create).toHaveBeenCalledTimes(1);
  });

  it("records an ADD transaction for an ENERGY card", async () => {
    const { repository } = createRepository({ ...baseCard, id: "energy", kind: "ENERGY" });

    await expect(
      recordCollectionTransaction({ cardId: "energy", variant: "NORMAL", type: "ADD", quantity: 1 }, repository),
    ).resolves.toMatchObject({ cardId: "energy", variant: "NORMAL" });
  });

  it("rejects TOKEN card transactions", async () => {
    const { repository } = createRepository({ ...baseCard, kind: "TOKEN" });

    await expectServiceError({ cardId: "token", variant: "NORMAL", type: "ADD", quantity: 1 }, "UNTRACKABLE_CARD_KIND", repository);
    expect(repository.collectionTransaction.create).not.toHaveBeenCalled();
  });

  it("rejects RULES card transactions", async () => {
    const { repository } = createRepository({ ...baseCard, kind: "RULES" });

    await expectServiceError({ cardId: "rules", variant: "NORMAL", type: "ADD", quantity: 1 }, "UNTRACKABLE_CARD_KIND", repository);
    expect(repository.collectionTransaction.create).not.toHaveBeenCalled();
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

  it("rejects NORMAL for higher-rarity cards", async () => {
    const { repository } = createRepository({ ...baseCard, rarity: "RARE" });

    await expectServiceError({ cardId: "rare", variant: "NORMAL", type: "ADD", quantity: 1 }, "INVALID_VARIANT_FOR_CARD", repository);
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

  it("accepts SET with quantity 0", async () => {
    const { repository } = createRepository();

    await expect(
      recordCollectionTransaction({ cardId: "card-common", variant: "NORMAL", type: "SET", quantity: 0 }, repository),
    ).resolves.toMatchObject({ type: "SET", quantity: 0 });
  });

  it("accepts ADJUST with negative quantity", async () => {
    const { repository } = createRepository();

    await expect(
      recordCollectionTransaction({ cardId: "card-common", variant: "NORMAL", type: "ADJUST", quantity: -1 }, repository),
    ).resolves.toMatchObject({ type: "ADJUST", quantity: -1 });
  });

  it("rejects ADJUST with quantity 0", async () => {
    await expectServiceError({ cardId: "card-common", variant: "NORMAL", type: "ADJUST", quantity: 0 }, "INVALID_INPUT");
  });

  it("does not create or update CollectionEntry rows", async () => {
    const { repository } = createRepository();
    const repositoryWithCollectionEntries = {
      ...repository,
      collectionEntry: {
        create: vi.fn(),
        update: vi.fn(),
        upsert: vi.fn(),
      },
    };

    await recordCollectionTransaction(
      { cardId: "card-common", variant: "NORMAL", type: "ADD", quantity: 1 },
      repositoryWithCollectionEntries,
    );

    expect(repositoryWithCollectionEntries.collectionEntry.create).not.toHaveBeenCalled();
    expect(repositoryWithCollectionEntries.collectionEntry.update).not.toHaveBeenCalled();
    expect(repositoryWithCollectionEntries.collectionEntry.upsert).not.toHaveBeenCalled();
  });
});
