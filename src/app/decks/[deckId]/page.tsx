import { notFound } from "next/navigation";
import Link from "next/link";

import { cardKindLabelsFr, cardPrintTreatmentLabelsFr, cardRarityLabelsFr, cardVariantLabelsFr } from "@/lib/formatters/cards";
import { formatDateTimeFr } from "@/lib/formatters/dates";
import { deckAllocationStrategyLabelsFr, deckCardVariantPreferenceLabelsFr, deckStatusLabelsFr } from "@/lib/formatters/decks";
import { getDeckDetailPageData } from "@/lib/queries/decks";
import { addDeckRequirementAction, assembleDeckAction, deleteDeckRequirementAction, updateDeckRequirementAction } from "../actions";
import { AddDeckRequirementForm } from "./AddDeckRequirementForm";

export const dynamic = "force-dynamic";

type DeckDetailPageProps = {
  params: Promise<{ deckId: string }>;
  searchParams?: Promise<{ assemblyError?: string; assembled?: string }>;
};

export default async function DeckDetailPage({ params, searchParams }: DeckDetailPageProps) {
  const { deckId } = await params;
  const statusMessage = await searchParams;
  const deck = await getDeckDetailPageData(deckId);

  if (!deck) {
    notFound();
  }

  const editHref = `/decks/${encodeURIComponent(deck.deckId)}/edit`;

  return (
    <main className="min-h-screen px-8 py-6">
      <section className="mx-auto grid max-w-[var(--content-max)] gap-6">
        <header className="rounded-panel border border-[rgba(199,168,102,0.42)] bg-[rgba(8,17,27,0.88)] p-8 shadow-panel backdrop-blur">
          <nav className="flex flex-wrap gap-4 text-sm text-archive-gold300">
            <Link className="hover:text-archive-text100" href="/decks">← Retour aux decks</Link>
            <Link className="hover:text-archive-text100" href={editHref}>Modifier le deck →</Link>
          </nav>
          <p className="mt-6 text-sm uppercase tracking-[0.42em] text-archive-gold300">Deckbuilding — Phase 6G</p>
          <h1 className="mt-4 text-5xl font-semibold text-archive-text100">{deck.name}</h1>
          <p className="mt-4 max-w-4xl text-base leading-7 text-archive-text300">Gestion minimale des cartes requises et disponibilité en lecture seule.</p>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-archive-text500">Cette page permet de gérer les cartes requises du deck. L’assemblage crée des allocations persistées quand toute la liste peut être satisfaite.</p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <form action={assembleDeckAction.bind(null, deck.deckId)}>
              <button className="rounded-chip border border-[rgba(199,168,102,0.52)] bg-[rgba(199,168,102,0.16)] px-5 py-3 font-semibold text-archive-gold300 hover:text-archive-text100 disabled:cursor-not-allowed disabled:opacity-50" disabled={deck.status !== "THEORETICAL"} type="submit">Assembler le deck</button>
            </form>
            {deck.status !== "THEORETICAL" ? <p className="text-sm text-archive-text500">Seuls les decks théoriques peuvent être assemblés.</p> : null}
          </div>
          {statusMessage?.assembled ? <p className="mt-4 rounded-card border border-[rgba(121,184,90,0.45)] bg-[rgba(121,184,90,0.12)] px-4 py-3 text-sm text-green-200">Deck assemblé avec succès.</p> : null}
          {statusMessage?.assemblyError ? <p className="mt-4 rounded-card border border-[rgba(217,74,74,0.58)] bg-[rgba(217,74,74,0.13)] px-4 py-3 text-sm text-red-200">Assemblage impossible : {statusMessage.assemblyError}</p> : null}
        </header>

        <section className="grid gap-4 lg:grid-cols-4">
          <article className="rounded-card border border-[rgba(199,168,102,0.28)] bg-[rgba(16,32,51,0.72)] p-5 shadow-panel lg:col-span-2">
            <h2 className="text-2xl font-semibold text-archive-text100">Métadonnées</h2>
            <dl className="mt-4 grid gap-3 text-sm text-archive-text300 sm:grid-cols-2">
              <div><dt className="text-archive-text500">Statut</dt><dd className="mt-1 text-archive-text100">{deckStatusLabelsFr[deck.status]}</dd></div>
              <div><dt className="text-archive-text500">Stratégie</dt><dd className="mt-1 text-archive-text100">{deckAllocationStrategyLabelsFr[deck.allocationStrategy]}</dd></div>
              <div><dt className="text-archive-text500">Créé</dt><dd className="mt-1 text-archive-text100">{formatDateTimeFr(deck.createdAt)}</dd></div>
              <div><dt className="text-archive-text500">Mis à jour</dt><dd className="mt-1 text-archive-text100">{formatDateTimeFr(deck.updatedAt)}</dd></div>
            </dl>
            {deck.description ? <p className="mt-5 text-sm leading-6 text-archive-text300">{deck.description}</p> : null}
          </article>
          {[
            ["Lignes requises", deck.summary.requirementLineCount],
            ["Cartes requises", deck.summary.requiredCardQuantity],
            ["Allocations", deck.summary.allocationLineCount],
            ["Cartes allouées", deck.summary.allocatedCardQuantity],
          ].map(([label, value]) => (
            <article className="rounded-card border border-[rgba(199,168,102,0.28)] bg-[rgba(16,32,51,0.72)] p-5 shadow-panel" key={label}>
              <p className="text-sm text-archive-text300">{label}</p>
              <p className="mt-3 text-4xl font-semibold text-archive-gold300">{value}</p>
            </article>
          ))}
        </section>

        <section className="rounded-panel border border-[rgba(199,168,102,0.34)] bg-[rgba(5,8,14,0.72)] p-5 shadow-panel">
          <h2 className="text-2xl font-semibold text-archive-text100">Résumé</h2>
          <p className="mt-2 text-sm text-archive-text300">Vue de gestion des exigences DeckCard avec assemblage atomique ; les allocations enregistrées restent en lecture seule.</p>
        </section>

        <section className="overflow-hidden rounded-panel border border-[rgba(199,168,102,0.34)] bg-[rgba(5,8,14,0.72)] shadow-panel">
          <div className="border-b border-[rgba(199,168,102,0.22)] p-5">
            <h2 className="text-2xl font-semibold text-archive-text100">Cartes requises</h2>
            <p className="mt-2 text-sm text-archive-text300">Édition des exigences uniquement, sans allocation automatique.</p>
          </div>
          <AddDeckRequirementForm action={addDeckRequirementAction.bind(null, deck.deckId)} cardOptions={deck.cardOptions} preferenceLabels={deckCardVariantPreferenceLabelsFr} />
          {deck.requirements.length === 0 ? <p className="p-8 text-archive-text300">Aucune carte requise dans ce deck.</p> : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-[rgba(16,32,51,0.74)] text-xs uppercase tracking-[0.24em] text-archive-gold300">
                  <tr>{["Carte", "Set", "N°", "Rareté", "Type", "Traitement", "Préférence", "Quantité", "Actions"].map((h) => <th className="px-4 py-4" key={h}>{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-[rgba(199,168,102,0.16)]">
                  {deck.requirements.map((row) => {
                    const editFormId = `edit-${row.deckCardId}`;
                    return (
                      <tr className="text-archive-text300" key={row.deckCardId}>
                        <td className="px-4 py-4 font-semibold text-archive-text100">{row.displayName}</td>
                        <td className="px-4 py-4">{row.set.code}</td>
                        <td className="px-4 py-4">{row.collectorNumber}</td>
                        <td className="px-4 py-4">{cardRarityLabelsFr[row.rarity]}</td>
                        <td className="px-4 py-4">{cardKindLabelsFr[row.kind]}</td>
                        <td className="px-4 py-4">{cardPrintTreatmentLabelsFr[row.printTreatment]}</td>
                        <td className="px-4 py-4">
                          <select className="rounded-card border border-[rgba(199,168,102,0.34)] bg-[rgba(8,17,27,0.95)] px-2 py-1 text-archive-text100" form={editFormId} name="preferredVariant" defaultValue={row.preferredVariant}>
                            {row.allowedPreferences.map((value) => <option key={value} value={value}>{deckCardVariantPreferenceLabelsFr[value]}</option>)}
                          </select>
                        </td>
                        <td className="px-4 py-4">
                          <input className="w-20 rounded-card border border-[rgba(199,168,102,0.34)] bg-[rgba(8,17,27,0.95)] px-2 py-1 text-right text-archive-text100" form={editFormId} min={1} name="quantity" step={1} type="number" defaultValue={row.quantity} required />
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex gap-2">
                            <form action={updateDeckRequirementAction.bind(null, deck.deckId, row.deckCardId)} id={editFormId}>
                              <input name="cardId" type="hidden" value={row.cardId} />
                              <button className="rounded-chip border border-[rgba(199,168,102,0.42)] px-3 py-1 text-xs text-archive-gold300" type="submit">Modifier</button>
                            </form>
                            <form action={deleteDeckRequirementAction.bind(null, deck.deckId, row.deckCardId)}>
                              <button className="rounded-chip border border-[rgba(217,74,74,0.45)] px-3 py-1 text-xs text-red-200" type="submit">Retirer</button>
                            </form>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded-panel border border-[rgba(199,168,102,0.34)] bg-[rgba(5,8,14,0.72)] shadow-panel">
          <div className="border-b border-[rgba(199,168,102,0.22)] p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-archive-text100">Disponibilité du deck</h2>
                <p className="mt-2 text-sm text-archive-text300">Lecture seule : cette section compare les cartes requises avec les cartes actuellement disponibles.</p>
              </div>
              <p className={`rounded-chip border px-4 py-2 text-sm ${deck.missing.summary.isComplete ? "border-[rgba(121,184,90,0.45)] text-green-200" : "border-[rgba(217,164,65,0.5)] text-amber-200"}`}>
                {deck.missing.summary.isComplete ? "Deck complet avec les cartes disponibles." : "Deck incomplet avec les cartes disponibles."}
              </p>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["Lignes complètes", deck.missing.summary.completeLineCount],
                ["Lignes manquantes", deck.missing.summary.missingLineCount],
                ["Cartes satisfaites", deck.missing.summary.satisfiedCardQuantity],
                ["Cartes manquantes", deck.missing.summary.missingCardQuantity],
              ].map(([label, value]) => (
                <article className="rounded-card border border-[rgba(199,168,102,0.22)] bg-[rgba(16,32,51,0.62)] p-4" key={label}>
                  <p className="text-xs uppercase tracking-[0.2em] text-archive-text500">{label}</p>
                  <p className="mt-2 text-3xl font-semibold text-archive-gold300">{value}</p>
                </article>
              ))}
            </div>
          </div>
          {deck.missing.rows.length === 0 ? <p className="p-8 text-archive-text300">Aucune carte requise à vérifier.</p> : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-[rgba(16,32,51,0.74)] text-xs uppercase tracking-[0.24em] text-archive-gold300">
                  <tr>{["Carte", "Set", "N°", "Préférence", "Requis", "Satisfait", "Manquant", "Variantes utilisées"].map((h) => <th className="px-4 py-4" key={h}>{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-[rgba(199,168,102,0.16)]">
                  {deck.missing.rows.map((row) => (
                    <tr className="text-archive-text300" key={`${row.cardId}-${row.preferredVariant}`}>
                      <td className="px-4 py-4 font-semibold text-archive-text100">{row.displayName}</td>
                      <td className="px-4 py-4">{row.set.code}</td>
                      <td className="px-4 py-4">{row.collectorNumber}</td>
                      <td className="px-4 py-4">{deckCardVariantPreferenceLabelsFr[row.preferredVariant]}</td>
                      <td className="px-4 py-4 text-right tabular-nums">{row.requiredQuantity}</td>
                      <td className="px-4 py-4 text-right tabular-nums">{row.satisfiedQuantity}</td>
                      <td className="px-4 py-4 text-right tabular-nums">{row.missingQuantity}</td>
                      <td className="px-4 py-4">
                        {row.usedVariants.length === 0 ? "—" : row.usedVariants.map((usedVariant) => `${cardVariantLabelsFr[usedVariant.variant]} × ${usedVariant.quantity}`).join(", ")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded-panel border border-[rgba(199,168,102,0.34)] bg-[rgba(5,8,14,0.72)] shadow-panel">
          <div className="border-b border-[rgba(199,168,102,0.22)] p-5"><h2 className="text-2xl font-semibold text-archive-text100">Allocations existantes</h2></div>
          {deck.allocations.length === 0 ? <p className="p-8 text-archive-text300">Aucune allocation enregistrée pour ce deck.</p> : (
            <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="bg-[rgba(16,32,51,0.74)] text-xs uppercase tracking-[0.24em] text-archive-gold300"><tr>{["Carte","Set","N°","Variante","Quantité"].map((h)=><th className="px-4 py-4" key={h}>{h}</th>)}</tr></thead><tbody className="divide-y divide-[rgba(199,168,102,0.16)]">{deck.allocations.map((row)=><tr className="text-archive-text300" key={row.allocationId}><td className="px-4 py-4 font-semibold text-archive-text100">{row.displayName}</td><td className="px-4 py-4">{row.set.code}</td><td className="px-4 py-4">{row.collectorNumber}</td><td className="px-4 py-4">{cardVariantLabelsFr[row.variant]}</td><td className="px-4 py-4 text-right tabular-nums">{row.quantity}</td></tr>)}</tbody></table></div>
          )}
        </section>
      </section>
    </main>
  );
}
