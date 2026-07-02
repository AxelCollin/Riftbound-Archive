"use client";

import { useMemo, useState } from "react";

import type { DeckCardVariantPreference } from "@prisma/client";
import { cardKindLabelsFr, cardRarityLabelsFr } from "@/lib/formatters/cards";
import type { DeckRequirementCardOption } from "@/lib/queries/decks";

type DeckCardCatalogProps = {
  action: (formData: FormData) => void | Promise<void>;
  canAddCards: boolean;
  cardOptions: DeckRequirementCardOption[];
  preferenceLabels: Record<DeckCardVariantPreference, string>;
};

const rarityOptions = ["COMMON", "UNCOMMON", "RARE", "EPIC", "ULTIMATE", "UNKNOWN"] as const;
const kindOptions = ["GAMEPLAY", "ENERGY"] as const;

function normalizeSearchValue(value: string): string {
  return value.trim().toLocaleLowerCase("fr");
}

function cardMatchesSearch(card: DeckRequirementCardOption, query: string): boolean {
  if (!query) {
    return true;
  }

  return [
    card.displayName,
    card.officialName,
    card.set.code,
    card.collectorNumber,
    card.rarity,
    card.kind,
    cardRarityLabelsFr[card.rarity],
    cardKindLabelsFr[card.kind],
  ].some((value) => normalizeSearchValue(value).includes(query));
}

export function DeckCardCatalog({
  action,
  canAddCards,
  cardOptions,
  preferenceLabels,
}: DeckCardCatalogProps) {
  const [search, setSearch] = useState("");
  const [rarity, setRarity] = useState("");
  const [kind, setKind] = useState("");

  const normalizedSearch = normalizeSearchValue(search);
  const filteredCards = useMemo(
    () => cardOptions.filter((card) => (
      cardMatchesSearch(card, normalizedSearch)
      && (!rarity || card.rarity === rarity)
      && (!kind || card.kind === kind)
    )),
    [cardOptions, kind, normalizedSearch, rarity],
  );

  return (
    <section className="overflow-hidden rounded-panel border border-[rgba(199,168,102,0.34)] bg-[rgba(5,8,14,0.72)] shadow-panel">
      <div className="border-b border-[rgba(199,168,102,0.22)] p-5">
        <p className="text-xs uppercase tracking-[0.28em] text-archive-gold300">
          Catalogue de cartes
        </p>
        <h2 className="mt-3 text-2xl font-semibold text-archive-text100">
          Rechercher et ajouter une exigence
        </h2>
        <p className="mt-2 text-sm text-archive-text300">
          Filtrez les cartes suivies par nom, set, numéro, rareté ou type, puis ajoutez une exigence DeckCard avec la même validation serveur que le formulaire existant.
        </p>
        {!canAddCards ? (
          <p className="mt-4 rounded-card border border-[rgba(217,164,65,0.5)] bg-[rgba(217,164,65,0.10)] px-4 py-3 text-sm text-amber-100">
            Ce deck est assemblé : il doit être désassemblé avant d’ajouter des cartes depuis le catalogue.
          </p>
        ) : null}
        <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(260px,1fr)_220px_220px]">
          <label className="grid gap-2 text-sm text-archive-text300">
            Recherche
            <input
              className="rounded-card border border-[rgba(199,168,102,0.34)] bg-[rgba(8,17,27,0.95)] px-3 py-2 text-archive-text100 placeholder:text-archive-text500"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Nom, set ou numéro…"
              type="search"
              value={search}
            />
          </label>
          <label className="grid gap-2 text-sm text-archive-text300">
            Rareté
            <select className="rounded-card border border-[rgba(199,168,102,0.34)] bg-[rgba(8,17,27,0.95)] px-3 py-2 text-archive-text100" onChange={(event) => setRarity(event.target.value)} value={rarity}>
              <option value="">Toutes les raretés</option>
              {rarityOptions.map((value) => <option key={value} value={value}>{cardRarityLabelsFr[value]}</option>)}
            </select>
          </label>
          <label className="grid gap-2 text-sm text-archive-text300">
            Type
            <select className="rounded-card border border-[rgba(199,168,102,0.34)] bg-[rgba(8,17,27,0.95)] px-3 py-2 text-archive-text100" onChange={(event) => setKind(event.target.value)} value={kind}>
              <option value="">Tous les types</option>
              {kindOptions.map((value) => <option key={value} value={value}>{cardKindLabelsFr[value]}</option>)}
            </select>
          </label>
        </div>
        <p className="mt-4 text-sm text-archive-text500">
          {filteredCards.length} résultat{filteredCards.length > 1 ? "s" : ""} sur {cardOptions.length} cartes suivies.
        </p>
      </div>
      {filteredCards.length === 0 ? (
        <p className="p-8 text-archive-text300">Aucune carte ne correspond aux filtres.</p>
      ) : (
        <div className="grid gap-3 p-5 xl:grid-cols-2">
          {filteredCards.map((card) => (
            <form action={action} className="rounded-card border border-[rgba(199,168,102,0.22)] bg-[rgba(16,32,51,0.58)] p-4" key={card.cardId}>
              <input name="cardId" type="hidden" value={card.cardId} />
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-archive-text100">{card.displayName}</p>
                  <p className="mt-1 text-sm text-archive-text500">{card.set.code} · N° {card.collectorNumber} · {cardRarityLabelsFr[card.rarity]} · {cardKindLabelsFr[card.kind]}</p>
                </div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_110px_auto]">
                <label className="grid gap-2 text-xs uppercase tracking-[0.16em] text-archive-text500">
                  Variante
                  <select className="rounded-card border border-[rgba(199,168,102,0.34)] bg-[rgba(8,17,27,0.95)] px-3 py-2 text-sm text-archive-text100 disabled:opacity-50" disabled={!canAddCards} name="preferredVariant" defaultValue="ANY">
                    {card.allowedPreferences.map((value) => <option key={value} value={value}>{preferenceLabels[value]}</option>)}
                  </select>
                </label>
                <label className="grid gap-2 text-xs uppercase tracking-[0.16em] text-archive-text500">
                  Quantité
                  <input className="rounded-card border border-[rgba(199,168,102,0.34)] bg-[rgba(8,17,27,0.95)] px-3 py-2 text-sm text-archive-text100 disabled:opacity-50" disabled={!canAddCards} min={1} name="quantity" step={1} type="number" defaultValue={1} required />
                </label>
                <button className="self-end rounded-chip border border-[rgba(199,168,102,0.48)] px-5 py-2 text-sm font-semibold text-archive-gold300 hover:bg-[rgba(199,168,102,0.12)] disabled:cursor-not-allowed disabled:opacity-45" disabled={!canAddCards} type="submit">
                  Ajouter
                </button>
              </div>
            </form>
          ))}
        </div>
      )}
    </section>
  );
}
