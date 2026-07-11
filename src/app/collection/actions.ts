"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { recordCollectionTransaction } from "@/lib/services/collection-transactions";

const editableFinishes = ["NORMAL", "FOIL"] as const;
type EditableFinish = (typeof editableFinishes)[number];

function isEditableFinish(value: string): value is EditableFinish {
  return editableFinishes.includes(value as EditableFinish);
}

export async function updateCollectionQuantityAction(formData: FormData): Promise<void> {
  const cardId = String(formData.get("cardId") ?? "").trim();
  const finish = String(formData.get("finish") ?? "").trim();
  const operation = String(formData.get("operation") ?? "").trim();

  if (!cardId || !isEditableFinish(finish) || (operation !== "ADD" && operation !== "REMOVE")) {
    redirect(`/collection?quantityError=${encodeURIComponent("Modification de collection invalide.")}`);
  }

  try {
    await recordCollectionTransaction({
      cardId,
      variant: finish,
      type: operation,
      quantity: 1,
      cardLanguage: "UNKNOWN",
      source: "COLLECTION_DIRECT_EDIT",
      note: `Édition directe collection ${operation === "ADD" ? "+1" : "-1"} ${finish}`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Modification de collection impossible.";
    redirect(`/collection?quantityError=${encodeURIComponent(message)}`);
  }

  revalidatePath("/collection");
  redirect("/collection?quantityUpdated=1");
}
