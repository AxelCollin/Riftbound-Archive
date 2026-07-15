"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCardDetailHref } from "@/app/collection/card-detail-link";
import { isPhysicalFinish } from "@/lib/domain/physical-finishes";
import { recordCollectionFinishAdjustment } from "@/lib/services/collection-transactions";
import { setCardFavorite, setCardNote } from "@/lib/services/card-user-meta";

function redirectToCard(cardId: string, key: string, message = "1"): never {
  redirect(`${getCardDetailHref(cardId)}?${key}=${encodeURIComponent(message)}`);
}
function safeCardId(formData: FormData) { return String(formData.get("cardId") ?? "").trim(); }
function revalidateCardPaths(cardId: string) {
  revalidatePath(getCardDetailHref(cardId));
  revalidatePath(`${getCardDetailHref(cardId)}/availability`);
}

export async function updateCardDetailQuantityAction(formData: FormData): Promise<void> {
  const cardId = safeCardId(formData);
  const physicalFinish = String(formData.get("physicalFinish") ?? "").trim();
  const operation = String(formData.get("operation") ?? "").trim();
  if (!cardId) redirectToCard("", "quantityError", "Identifiant de carte invalide.");
  if (!isPhysicalFinish(physicalFinish)) redirectToCard(cardId, "quantityError", "Finition physique invalide.");
  if (operation !== "ADD" && operation !== "REMOVE") redirectToCard(cardId, "quantityError", "Opération de quantité invalide.");
  try {
    await recordCollectionFinishAdjustment({ cardId, physicalFinish, operation, quantity: 1, cardLanguage: "UNKNOWN", source: "CARD_DETAIL_DIRECT_EDIT", note: `Édition détail carte ${operation === "ADD" ? "+1" : "-1"} ${physicalFinish}` });
  } catch (error) {
    redirectToCard(cardId, "quantityError", error instanceof Error ? error.message : "Modification de quantité impossible.");
  }
  revalidateCardPaths(cardId); revalidatePath("/collection"); revalidatePath("/binder");
  redirectToCard(cardId, "quantityUpdated");
}

export async function updateCardFavoriteAction(formData: FormData): Promise<void> {
  const cardId = safeCardId(formData);
  const favoriteValue = String(formData.get("favorite") ?? "").trim();
  if (!cardId) redirectToCard("", "favoriteError", "Identifiant de carte invalide.");
  if (favoriteValue !== "true" && favoriteValue !== "false") redirectToCard(cardId, "favoriteError", "Valeur de favori invalide.");
  try { await setCardFavorite({ cardId, favorite: favoriteValue === "true" }); }
  catch (error) { redirectToCard(cardId, "favoriteError", error instanceof Error ? error.message : "Modification du favori impossible."); }
  revalidatePath(getCardDetailHref(cardId)); revalidatePath("/collection");
  redirectToCard(cardId, "favoriteUpdated");
}

export async function updateCardNoteAction(formData: FormData): Promise<void> {
  const cardId = safeCardId(formData);
  const note = String(formData.get("note") ?? "");
  if (!cardId) redirectToCard("", "noteError", "Identifiant de carte invalide.");
  try { await setCardNote({ cardId, note }); }
  catch (error) { redirectToCard(cardId, "noteError", error instanceof Error ? error.message : "Modification de la note impossible."); }
  revalidatePath(getCardDetailHref(cardId));
  redirectToCard(cardId, "noteUpdated");
}
