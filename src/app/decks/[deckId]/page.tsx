import { notFound } from "next/navigation";
import Link from "next/link";

import { cardKindLabelsFr, cardPrintTreatmentLabelsFr, cardRarityLabelsFr, cardVariantLabelsFr } from "@/lib/formatters/cards";
import { formatDateTimeFr } from "@/lib/formatters/dates";
import { deckAllocationStrategyLabelsFr, deckCardVariantPreferenceLabelsFr, deckStatusLabelsFr } from "@/lib/formatters/decks";
import { getDeckDetailPageData } from "@/lib/queries/decks";

export const dynamic = "force-dynamic";

type DeckDetailPageProps = {
  params: Promise<{ deckId: string }>;
};

export default async function DeckDetailPage({ params }: DeckDetailPageProps) {
  const { deckId } = await params;
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
          <p className="mt-6 text-sm uppercase tracking-[0.42em] text-archive-gold300">Deckbuilding — Phase 6D</p>
          <h1 className="mt-4 text-5xl font-semibold text-archive-text100">{deck.name}</h1>
          <p className="mt-4 max-w-4xl text-base leading-7 text-archive-text300">Détail en lecture seule du deck.</p>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-archive-text500">L’ajout et l’édition des cartes du deck arriveront dans une prochaine étape.</p>
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
          <p className="mt-2 text-sm text-archive-text300">Vue de consultation des exigences et allocations déjà enregistrées.</p>
        </section>

        <section className="overflow-hidden rounded-panel border border-[rgba(199,168,102,0.34)] bg-[rgba(5,8,14,0.72)] shadow-panel">
          <div className="border-b border-[rgba(199,168,102,0.22)] p-5"><h2 className="text-2xl font-semibold text-archive-text100">Cartes requises</h2></div>
          {deck.requirements.length === 0 ? <p className="p-8 text-archive-text300">Aucune carte requise dans ce deck.</p> : (
            <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="bg-[rgba(16,32,51,0.74)] text-xs uppercase tracking-[0.24em] text-archive-gold300"><tr>{["Carte","Set","N°","Rareté","Type","Traitement","Préférence","Quantité"].map((h)=><th className="px-4 py-4" key={h}>{h}</th>)}</tr></thead><tbody className="divide-y divide-[rgba(199,168,102,0.16)]">{deck.requirements.map((row)=><tr className="text-archive-text300" key={row.deckCardId}><td className="px-4 py-4 font-semibold text-archive-text100">{row.displayName}</td><td className="px-4 py-4">{row.set.code}</td><td className="px-4 py-4">{row.collectorNumber}</td><td className="px-4 py-4">{cardRarityLabelsFr[row.rarity]}</td><td className="px-4 py-4">{cardKindLabelsFr[row.kind]}</td><td className="px-4 py-4">{cardPrintTreatmentLabelsFr[row.printTreatment]}</td><td className="px-4 py-4">{deckCardVariantPreferenceLabelsFr[row.preferredVariant]}</td><td className="px-4 py-4 text-right tabular-nums">{row.quantity}</td></tr>)}</tbody></table></div>
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
