"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { getCardDetailHref } from "./card-detail-link";
import { cardKindLabelsFr, cardPrintTreatmentLabelsFr, cardRarityLabelsFr, cardVariantLabelsFr } from "@/lib/formatters/cards";
import {
  defaultCollectionDisplayMode,
  filterCollectionRows,
  getCollectionDisplayQuantity,
  type CollectionDisplayMode,
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

const quantityDisplayModeOptions: Array<{ value: CollectionDisplayMode; label: string }> = [
  { value: "OWNED", label: "Possédées" },
  { value: "AVAILABLE", label: "Disponibles" },
];

type CollectionViewMode = "GRID" | "LINE" | "COMPACT";

const defaultCollectionViewMode: CollectionViewMode = "LINE";

const viewModeOptions: Array<{ value: CollectionViewMode; label: string }> = [
  { value: "GRID", label: "Grille" },
  { value: "LINE", label: "Ligne" },
  { value: "COMPACT", label: "Compact" },
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
  displayMode: CollectionDisplayMode;
  viewMode: CollectionViewMode;
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
    displayMode: defaultCollectionDisplayMode,
    viewMode: defaultCollectionViewMode,
  });

  const filteredRows = useMemo(() => filterCollectionRows(rows, filters), [rows, filters]);
  const selectedQuantityLabel = filters.displayMode === "AVAILABLE" ? "Disponibles" : "Possédées";

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

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-7">
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
          <SelectFilter label="Quantité affichée" onChange={(value) => updateFilter("displayMode", value)} options={quantityDisplayModeOptions} value={filters.displayMode} />
          <SelectFilter label="Vue" onChange={(value) => updateFilter("viewMode", value)} options={viewModeOptions} value={filters.viewMode} />
        </div>
      </div>

      {filteredRows.length === 0 ? (
        <div className="p-10 text-center">
          <p className="text-xl font-semibold text-archive-gold300">Aucune ligne ne correspond aux filtres.</p>
          <p className="mt-3 text-archive-text300">Modifiez la recherche ou réinitialisez les filtres pour retrouver les cartes suivies.</p>
        </div>
      ) : (
        <CollectionRowsView rows={filteredRows} quantityDisplayMode={filters.displayMode} selectedQuantityLabel={selectedQuantityLabel} viewMode={filters.viewMode} />
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


type CollectionRowsViewProps = {
  quantityDisplayMode: CollectionDisplayMode;
  rows: CollectionDisplayRow[];
  selectedQuantityLabel: string;
  viewMode: CollectionViewMode;
};

function CollectionRowsView({ quantityDisplayMode, rows, selectedQuantityLabel, viewMode }: CollectionRowsViewProps) {
  if (viewMode === "GRID") {
    return <CollectionGrid rows={rows} quantityDisplayMode={quantityDisplayMode} selectedQuantityLabel={selectedQuantityLabel} />;
  }

  return (
    <CollectionTable
      compact={viewMode === "COMPACT"}
      rows={rows}
      quantityDisplayMode={quantityDisplayMode}
      selectedQuantityLabel={selectedQuantityLabel}
    />
  );
}

type CollectionViewProps = {
  quantityDisplayMode: CollectionDisplayMode;
  rows: CollectionDisplayRow[];
  selectedQuantityLabel: string;
};

function CollectionTable({ compact, quantityDisplayMode, rows, selectedQuantityLabel }: CollectionViewProps & { compact: boolean }) {
  const cellPadding = compact ? "px-4 py-2" : "px-5 py-4";
  const quantityClassName = compact ? "text-right font-semibold text-archive-gold300" : "text-right text-xl font-semibold text-archive-gold300";
  const totalClassName = compact ? "text-right font-semibold text-archive-text100" : "text-right text-lg font-semibold text-archive-text100";
  const binderClassName = compact ? "text-right font-semibold text-archive-gold300" : "text-right text-lg font-semibold text-archive-gold300";

  return (
    <div className="overflow-x-auto" data-testid={compact ? "collection-compact-view" : "collection-line-view"}>
      <table className="min-w-full border-collapse text-left text-sm" aria-label={compact ? "Collection compacte" : "Collection en lignes"}>
        <thead className="bg-[rgba(16,32,51,0.86)] text-xs uppercase tracking-[0.22em] text-archive-gold300">
          <tr>
            <th className={cellPadding}>Carte</th>
            <th className={cellPadding}>Set</th>
            <th className={cellPadding}>N°</th>
            <th className={cellPadding}>Rareté</th>
            <th className={cellPadding}>Type</th>
            <th className={cellPadding}>Traitement</th>
            <th className={cellPadding}>Variante</th>
            <th className={`${cellPadding} text-right`}>Quantité affichée ({selectedQuantityLabel})</th>
            <th className={`${cellPadding} text-right`}>Possédées</th>
            <th className={`${cellPadding} text-right`}>Réservées binder</th>
            <th className={`${cellPadding} text-right`}>Disponibles</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[rgba(199,168,102,0.14)]">
          {rows.map((row) => (
            <tr className="text-archive-text300 hover:bg-[rgba(58,123,213,0.08)]" key={row.rowId}>
              <td className={`${cellPadding} font-medium text-archive-text100`}>
                {compact ? (
                  <CardDetailLink row={row} />
                ) : (
                  <div className="flex items-center gap-3">
                    <CollectionCardImage cardName={row.cardName} officialImageUrl={row.officialImageUrl} mode="line" />
                    <CardDetailLink row={row} />
                  </div>
                )}
              </td>
              <td className={cellPadding} title={row.setName}>{row.setCode}</td>
              <td className={cellPadding}>{row.collectorNumber}</td>
              <td className={cellPadding}>{cardRarityLabelsFr[row.rarity]}</td>
              <td className={cellPadding}>{cardKindLabelsFr[row.kind]}</td>
              <td className={cellPadding}>{cardPrintTreatmentLabelsFr[row.printTreatment]}</td>
              <td className={`${cellPadding} text-archive-gold300`}>{cardVariantLabelsFr[row.variant]}</td>
              <td className={`${cellPadding} ${quantityClassName}`}>{getCollectionDisplayQuantity(row, quantityDisplayMode)}</td>
              <td className={`${cellPadding} ${totalClassName}`}>{row.ownedQuantity}</td>
              <td className={`${cellPadding} ${binderClassName}`}>{row.binderReservedQuantity}</td>
              <td className={`${cellPadding} ${totalClassName}`}>{row.availableQuantity}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CollectionGrid({ quantityDisplayMode, rows, selectedQuantityLabel }: CollectionViewProps) {
  return (
    <div className="grid gap-4 p-5 md:grid-cols-2 2xl:grid-cols-3" data-testid="collection-grid-view">
      {rows.map((row) => (
        <article className="rounded-card border border-[rgba(199,168,102,0.24)] bg-[rgba(8,17,27,0.82)] p-4 shadow-panel" key={row.rowId}>
          <CollectionCardImage cardName={row.cardName} officialImageUrl={row.officialImageUrl} mode="grid" />
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardDetailLink row={row} />
              <p className="mt-2 text-sm text-archive-text400">{row.setCode} · N° {row.collectorNumber} · {cardRarityLabelsFr[row.rarity]}</p>
            </div>
            <p className="rounded-chip border border-[rgba(199,168,102,0.28)] px-3 py-2 text-2xl font-semibold text-archive-gold300" aria-label={`Quantité affichée ${selectedQuantityLabel}`}>
              {getCollectionDisplayQuantity(row, quantityDisplayMode)}
            </p>
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm text-archive-text300">
            <CollectionMetric label="Type" value={cardKindLabelsFr[row.kind]} />
            <CollectionMetric label="Traitement" value={cardPrintTreatmentLabelsFr[row.printTreatment]} />
            <CollectionMetric label="Variante" value={cardVariantLabelsFr[row.variant]} emphasize />
            <CollectionMetric label="Possédées" value={row.ownedQuantity} />
            <CollectionMetric label="Réservées binder" value={row.binderReservedQuantity} emphasize />
            <CollectionMetric label="Disponibles" value={row.availableQuantity} />
          </dl>
        </article>
      ))}
    </div>
  );
}

function CollectionCardImage({
  cardName,
  mode,
  officialImageUrl,
}: {
  cardName: string;
  mode: "grid" | "line";
  officialImageUrl: string | null;
}) {
  const isGrid = mode === "grid";
  const frameClassName = isGrid
    ? "mb-4 aspect-[5/7] w-full overflow-hidden rounded-card border border-[rgba(199,168,102,0.34)] bg-[radial-gradient(circle_at_50%_18%,rgba(199,168,102,0.22),rgba(16,32,51,0.72)_44%,rgba(5,8,14,0.94)_100%)] shadow-inner"
    : "h-16 w-12 shrink-0 overflow-hidden rounded-[0.75rem] border border-[rgba(199,168,102,0.28)] bg-[radial-gradient(circle_at_50%_18%,rgba(199,168,102,0.18),rgba(16,32,51,0.76)_48%,rgba(5,8,14,0.96)_100%)] shadow-inner";
  const placeholderTextClassName = isGrid
    ? "text-sm font-semibold tracking-[0.2em] text-archive-gold300"
    : "text-[0.62rem] font-semibold tracking-[0.14em] text-archive-gold300";

  if (officialImageUrl) {
    return (
      <div className={frameClassName} data-testid={`collection-card-image-${mode}`}>
        <img
          alt={`Illustration de ${cardName}`}
          className="h-full w-full object-cover"
          loading="lazy"
          src={officialImageUrl}
        />
      </div>
    );
  }

  return (
    <div aria-label={`Illustration non disponible pour ${cardName}`} className={`${frameClassName} flex items-center justify-center p-2 text-center`} data-testid={`collection-card-placeholder-${mode}`} role="img">
      <span className={placeholderTextClassName}>No art</span>
    </div>
  );
}

function CollectionMetric({ emphasize = false, label, value }: { emphasize?: boolean; label: string; value: number | string }) {
  return (
    <div className="rounded-card border border-[rgba(199,168,102,0.16)] bg-[rgba(5,8,14,0.44)] px-3 py-2">
      <dt className="text-xs uppercase tracking-[0.16em] text-archive-text500">{label}</dt>
      <dd className={emphasize ? "mt-1 font-semibold text-archive-gold300" : "mt-1 font-semibold text-archive-text100"}>{value}</dd>
    </div>
  );
}

function CardDetailLink({ row }: { row: CollectionDisplayRow }) {
  return (
    <Link className="text-archive-text100 underline decoration-archive-gold300/40 underline-offset-4 hover:text-archive-gold300" href={getCardDetailHref(row.cardId)}>
      {row.cardName}
    </Link>
  );
}
