"use server";

import { redirect } from "next/navigation";

import { DEFAULT_BOOSTER_INTERVAL_UNIT, type BoosterOpeningPullInput } from "@/lib/domain/boosters";
import { recordBoosterOpening, updateBoosterSettings } from "@/lib/services/boosters";

export async function updateBoosterSettingsAction(formData: FormData): Promise<void> {
  try {
    await updateBoosterSettings({
      boostersPerInterval: String(formData.get("boostersPerInterval") ?? ""),
      intervalCount: 1,
      intervalUnit: DEFAULT_BOOSTER_INTERVAL_UNIT as "DAY",
      autoDecrementOnOpening: formData.get("autoDecrementOnOpening") === null ? false : "on",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Paramètres de boosters invalides.";
    redirect(`/boosters?error=${encodeURIComponent(message)}`);
  }

  redirect("/boosters?updated=1");
}

export async function recordBoosterOpeningAction(formData: FormData): Promise<void> {
  const pulls: BoosterOpeningPullInput[] = Array.from({ length: 5 }, (_, index) => ({
    cardId: String(formData.get(`pulls.${index}.cardId`) ?? ""),
    variant: String(formData.get(`pulls.${index}.variant`) ?? ""),
    quantity: String(formData.get(`pulls.${index}.quantity`) ?? ""),
  }));

  try {
    await recordBoosterOpening({
      boosterCount: String(formData.get("boosterCount") ?? ""),
      decrementCounter: formData.get("decrementCounter") === null ? false : "on",
      note: String(formData.get("note") ?? ""),
      pulls,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ouverture de boosters invalide.";
    redirect(`/boosters?openingError=${encodeURIComponent(message)}`);
  }

  redirect("/boosters?openingRecorded=1");
}
