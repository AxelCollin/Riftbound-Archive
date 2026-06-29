"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { getCardDetailHref } from "./card-detail-link";
import { cardKindLabelsFr, cardPrintTreatmentLabelsFr, cardRarityLabelsFr, cardVariantLabelsFr } from "@/lib/formatters/cards";
import {
  filterCollectionRows,
  type CollectionDisplayRow,
  type CollectionFilterInput,
  type CollectionOwnedStatusFilter,
} from "@/lib/domain/collection-display";

const rarityOptions: Array<{ value: NonNullable<CollectionFilterInput["rarity"]>; label: string }> = [
  { value: "ALL", label: "Toutes les raretés" },
  { value: "COMMON", label: cardRarityLabelsFr.COMMON },
  { value: "UNCOMMON", label: cardRarityLabelsFr.UNCOMMON },
  { value: "RARE", label: cardRarityLabelsFr.RARE },
  { value: "EPIC", label: cardRarityLabelsFr.EPIC },
  { value: "ULTIMATE", label: cardRarityLabelsFr.ULTIMATE },
  { value: "UNKNOWN", label: cardRarityLabelsFr.UNKNOWN },
];

const kindOptions: Array<{ value: NonNullable<CollectionFilterInput["kind"]>; label: string }> = [
  { value: "ALL", label: "Tous les types" },
  { value: "GAMEPLAY", label: cardKindLabelsFr.GAMEPLAY },
  { value: "ENERGY", label: cardKindLabelsFr.ENERGY },
];

const variantOptions: Array<{ value: NonNullable<CollectionFilterInput["variant"]>; label: string }> = [
  { value: "ALL", label: "Toutes les variantes" },
  { value: "NORMAL", label: cardVariantLabelsFr.NORMAL },
  { value: "FOIL", label: cardVariantLabelsFr.FOIL },
  { value: "SHOWCASE", label: cardVariantLabelsFr.SHOWCASE },
];

const ownedStatusOptions: Array<{ value: CollectionOwnedStatusFilter; label: string }> = [
  { value: "ALL", label: "Toutes les lignes" },
  { value: "OWNED", label: "Possédées seulement" },
  { value: "MISSING", label: "Manquantes seulement" },
];

type CollectionFilterState = {
  searchText: string;
  rarity: NonNullable<CollectionFilterInput["rarity"]>;
  kind: NonNullable<CollectionFilterInput["kind"]>;
  variant: NonNullable<CollectionFilterInput["variant"]>;
  ownedStatus: CollectionOwnedStatusFilter;
};

type CollectionFiltersProps = {
  rows: CollectionDisplayRow[];
};

export function CollectionFilters({ rows }: CollectionFiltersProps) {
  const [filters, setFilters] = useState<CollectionFilterState>({
    searchText: "",
    rarity: "ALL",
    kind: "ALL",
    variant: "ALL",
    ownedStatus: "ALL",
  });

  const filteredRows = useMemo(() => filterCollectionRows(rows, filters), [rows, filters]);

  function updateFilter<Key extends keyof CollectionFilterState>(key: Key, value: CollectionFilterState[Key]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  return (
    <section className="overflow-hidden rounded-panel border border-[rgba(199,168,102,0.34)] bg-[rgba(5,8,14,0.72)] shadow-panel">
      <div className="border-b border-[rgba(199,168,102,0.22)] p-5">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-archive-text100">Cartes suivies</h2>
            <p className="mt-2 text-sm text-archive-text300">Une ligne par carte et variante autorisée. Les jetons et cartes de règles sont exclus.</p>
          </div>
          <p className="rounded-chip border border-[rgba(199,168,102,0.28)] px-4 py-2 text-sm text-archive-gold300">
            {filteredRows.length} résultat{filteredRows.length > 1 ? "s" : ""} affiché{filteredRows.length > 1 ? "s" : ""} / {rows.length}
          </p>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <label className="grid gap-2 text-sm text-archive-text300 xl:col-span-2">
            Recherche
            <input
              className="rounded-card border border-[rgba(199,168,102,0.28)] bg-[rgba(8,17,27,0.9)] px-4 py-3 text-archive-text100 outline-none ring-archive-azure500/40 placeholder:text-archive-text500 focus:ring-2"
              onChange={(event) => updateFilter("searchText", event.target.value)}
              placeholder="Nom, set ou numéro…"
              type="search"
              value={filters.searchText}
            />
          </label>
          <SelectFilter label="Rareté" onChange={(value) => updateFilter("rarity", value)} options={rarityOptions} value={filters.rarity} />
          <SelectFilter label="Type" onChange={(value) => updateFilter("kind", value)} options={kindOptions} value={filters.kind} />
          <SelectFilter label="Variante" onChange={(value) => updateFilter("variant", value)} options={variantOptions} value={filters.variant} />
          <SelectFilter label="Statut" onChange={(value) => updateFilter("ownedStatus", value)} options={ownedStatusOptions} value={filters.ownedStatus} />
        </div>
      </div>

      {filteredRows.length === 0 ? (
        <div className="p-10 text-center">
          <p className="text-xl font-semibold text-archive-gold300">Aucune ligne ne correspond aux filtres.</p>
          <p className="mt-3 text-archive-text300">Modifiez la recherche ou réinitialisez les filtres pour retrouver les cartes suivies.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead className="bg-[rgba(16,32,51,0.86)] text-xs uppercase tracking-[0.22em] text-archive-gold300">
              <tr>
                <th className="px-5 py-4">Carte</th>
                <th className="px-5 py-4">Set</th>
                <th className="px-5 py-4">N°</th>
                <th className="px-5 py-4">Rareté</th>
                <th className="px-5 py-4">Type</th>
                <th className="px-5 py-4">Traitement</th>
                <th className="px-5 py-4">Variante</th>
                <th className="px-5 py-4 text-right">Possédées</th>
                <th className="px-5 py-4 text-right">Réservées binder</th>
                <th className="px-5 py-4 text-right">Disponibles</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(199,168,102,0.14)]">
              {filteredRows.map((row) => (
                <tr className="text-archive-text300 hover:bg-[rgba(58,123,213,0.08)]" key={row.rowId}>
                  <td className="px-5 py-4 font-medium text-archive-text100">
                    <Link className="text-archive-text100 underline decoration-archive-gold300/40 underline-offset-4 hover:text-archive-gold300" href={getCardDetailHref(row.cardId)}>
                      {row.cardName}
                    </Link>
                  </td>
                  <td className="px-5 py-4" title={row.setName}>{row.setCode}</td>
                  <td className="px-5 py-4">{row.collectorNumber}</td>
                  <td className="px-5 py-4">{cardRarityLabelsFr[row.rarity]}</td>
                  <td className="px-5 py-4">{cardKindLabelsFr[row.kind]}</td>
                  <td className="px-5 py-4">{cardPrintTreatmentLabelsFr[row.printTreatment]}</td>
                  <td className="px-5 py-4 text-archive-gold300">{cardVariantLabelsFr[row.variant]}</td>
                  <td className="px-5 py-4 text-right text-lg font-semibold text-archive-text100">{row.ownedQuantity}</td>
                  <td className="px-5 py-4 text-right text-lg font-semibold text-archive-gold300">{row.binderReservedQuantity}</td>
                  <td className="px-5 py-4 text-right text-lg font-semibold text-archive-text100">{row.availableQuantity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

type SelectFilterProps<Value extends string> = {
  label: string;
  onChange: (value: Value) => void;
  options: Array<{ value: Value; label: string }>;
  value: Value;
};

function SelectFilter<Value extends string>({ label, onChange, options, value }: SelectFilterProps<Value>) {
  return (
    <label className="grid gap-2 text-sm text-archive-text300">
      {label}
      <select
        className="rounded-card border border-[rgba(199,168,102,0.28)] bg-[rgba(8,17,27,0.9)] px-4 py-3 text-archive-text100 outline-none ring-archive-azure500/40 focus:ring-2"
        onChange={(event) => onChange(event.target.value as Value)}
        value={value}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  );
}
