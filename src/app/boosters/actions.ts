"use server";

import { redirect } from "next/navigation";

import { DEFAULT_BOOSTER_INTERVAL_UNIT } from "@/lib/domain/boosters";
import { updateBoosterSettings } from "@/lib/services/boosters";

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
