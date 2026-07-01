"use client";

import { useMemo, useState } from "react";

import type { DeckCardVariantPreference } from "@prisma/client";
import type { DeckRequirementCardOption } from "@/lib/queries/decks";

type AddDeckRequirementFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  cardOptions: DeckRequirementCardOption[];
  preferenceLabels: Record<DeckCardVariantPreference, string>;
};

export function AddDeckRequirementForm({
  action,
  cardOptions,
  preferenceLabels,
}: AddDeckRequirementFormProps) {
  const [selectedCardId, setSelectedCardId] = useState(cardOptions[0]?.cardId ?? "");

  const selectedCard = useMemo(
    () => cardOptions.find((card) => card.cardId === selectedCardId),
    [cardOptions, selectedCardId],
  );
  const allowedPreferences = selectedCard?.allowedPreferences ?? ["ANY"];

  return (
    <form action={action} className="grid gap-4 border-b border-[rgba(199,168,102,0.16)] p-5 lg:grid-cols-[minmax(260px,1fr)_180px_120px_auto]">
      <label className="grid gap-2 text-sm text-archive-text300">
        Carte
        <select
          className="rounded-card border border-[rgba(199,168,102,0.34)] bg-[rgba(8,17,27,0.95)] px-3 py-2 text-archive-text100"
          name="cardId"
          onChange={(event) => setSelectedCardId(event.target.value)}
          required
          value={selectedCardId}
        >
          {cardOptions.length === 0 ? <option value="">Aucune carte disponible</option> : null}
          {cardOptions.map((card) => (
            <option data-allowed-preferences={card.allowedPreferences.join(",")} key={card.cardId} value={card.cardId}>
              {card.set.code} {card.collectorNumber} — {card.displayName}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-2 text-sm text-archive-text300">
        Préférence
        <select className="rounded-card border border-[rgba(199,168,102,0.34)] bg-[rgba(8,17,27,0.95)] px-3 py-2 text-archive-text100" name="preferredVariant" defaultValue="ANY" key={selectedCardId}>
          {allowedPreferences.map((value) => <option key={value} value={value}>{preferenceLabels[value]}</option>)}
        </select>
      </label>
      <label className="grid gap-2 text-sm text-archive-text300">
        Quantité
        <input className="rounded-card border border-[rgba(199,168,102,0.34)] bg-[rgba(8,17,27,0.95)] px-3 py-2 text-archive-text100" min={1} name="quantity" step={1} type="number" defaultValue={1} required />
      </label>
      <button className="self-end rounded-chip border border-[rgba(199,168,102,0.48)] px-5 py-2 text-sm font-semibold text-archive-gold300 hover:bg-[rgba(199,168,102,0.12)]" type="submit">Ajouter</button>
    </form>
  );
}
