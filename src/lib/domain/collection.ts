export type CollectionQuantityTransactionType = "ADD" | "REMOVE" | "SET" | "ADJUST";

export interface CollectionQuantityTransaction {
  type: CollectionQuantityTransactionType;
  quantity: number;
}

export function getNextCollectionEntryQuantity(
  currentQuantity: number,
  transaction: CollectionQuantityTransaction,
): number {
  const nextQuantity = (() => {
    switch (transaction.type) {
      case "ADD":
        return currentQuantity + transaction.quantity;
      case "REMOVE":
        return currentQuantity - transaction.quantity;
      case "SET":
        return transaction.quantity;
      case "ADJUST":
        return currentQuantity + transaction.quantity;
    }
  })();

  if (nextQuantity < 0) {
    throw new RangeError("Collection entry quantity cannot become negative");
  }

  return nextQuantity;
}
