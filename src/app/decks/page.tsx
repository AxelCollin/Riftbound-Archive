import Link from "next/link";
import { formatDateTimeFr } from "@/lib/formatters/dates";
import { deckAllocationStrategyLabelsFr, deckStatusLabelsFr } from "@/lib/formatters/decks";
import { getDeckListPageData } from "@/lib/queries/decks";

export const dynamic = "force-dynamic";

export default async function DecksPage() {
  const { rows, summary } = await getDeckListPageData();
  const kpis = [
    { label: "Decks", value: summary.totalDecks },
    { label: "Théoriques", value: summary.theoreticalDecks },
    { label: "Assemblés", value: summary.assembledDecks },
    { label: "Archivés", value: summary.archivedDecks },
    { label: "Cartes requises", value: summary.totalRequiredCards },
    { label: "Cartes allouées", value: summary.totalAllocatedCards },
  ];

  return (
    <main className="min-h-screen px-8 py-6">
      <section className="mx-auto grid max-w-[var(--content-max)] gap-6">
        <header className="rounded-panel border border-[rgba(199,168,102,0.42)] bg-[rgba(8,17,27,0.88)] p-8 shadow-panel backdrop-blur">
          <nav className="flex flex-wrap gap-4 text-sm text-archive-gold300">
            <Link className="hover:text-archive-text100" href="/">← Accueil</Link>
            <Link className="hover:text-archive-text100" href="/collection">Collection →</Link>
            <Link className="hover:text-archive-text100" href="/binder">Binder →</Link>
            <Link className="hover:text-archive-text100" href="/decks/new">Créer un deck →</Link>
          </nav>
          <p className="mt-6 text-sm uppercase tracking-[0.42em] text-archive-gold300">Gestion des decks</p>
          <h1 className="mt-4 text-5xl font-semibold text-archive-text100">Decks</h1>
          <p className="mt-4 max-w-4xl text-base leading-7 text-archive-text300">
            Liste des decks enregistrés avec leur statut, leurs exigences, leurs allocations et leur synthèse.
          </p>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-archive-text500">
            Ouvrez un deck pour gérer ses exigences, consulter sa disponibilité, l’assembler ou le désassembler.
          </p>
        </header>

        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
          {kpis.map((kpi) => (
            <article className="rounded-card border border-[rgba(199,168,102,0.28)] bg-[rgba(16,32,51,0.72)] p-5 shadow-panel" key={kpi.label}>
              <p className="text-sm text-archive-text300">{kpi.label}</p>
              <p className="mt-3 text-4xl font-semibold text-archive-gold300">{kpi.value}</p>
            </article>
          ))}
        </div>

        <section className="overflow-hidden rounded-panel border border-[rgba(199,168,102,0.34)] bg-[rgba(5,8,14,0.72)] shadow-panel">
          <div className="border-b border-[rgba(199,168,102,0.22)] p-5">
            <h2 className="text-2xl font-semibold text-archive-text100">Decks enregistrés</h2>
            <p className="mt-2 text-sm text-archive-text300">
              Cette vue résume les decks sauvegardés, leurs statuts, les cartes requises et les allocations physiques déjà enregistrées.
            </p>
          </div>
          {rows.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-xl font-semibold text-archive-gold300">Aucun deck enregistré.</p>
              <p className="mt-3 text-archive-text300">
                Créez un deck théorique, puis ajoutez ses exigences depuis sa page de détail.
              </p>
              <Link className="mt-5 inline-flex rounded-chip border border-[rgba(199,168,102,0.52)] bg-[rgba(199,168,102,0.16)] px-5 py-3 font-semibold text-archive-gold300 hover:text-archive-text100" href="/decks/new">Créer un deck →</Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-left text-sm">
                <thead className="bg-[rgba(16,32,51,0.74)] text-xs uppercase tracking-[0.24em] text-archive-gold300">
                  <tr>
                    <th className="px-4 py-4">Deck</th>
                    <th className="px-4 py-4">Statut</th>
                    <th className="px-4 py-4">Stratégie</th>
                    <th className="px-4 py-4 text-right">Lignes</th>
                    <th className="px-4 py-4 text-right">Cartes requises</th>
                    <th className="px-4 py-4 text-right">Allocations</th>
                    <th className="px-4 py-4 text-right">Cartes allouées</th>
                    <th className="px-4 py-4">Mis à jour</th>
                    <th className="px-4 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[rgba(199,168,102,0.16)]">
                  {rows.map((row) => (
                    <tr className="text-archive-text300 hover:bg-[rgba(58,123,213,0.08)]" key={row.deckId}>
                      <td className="px-4 py-4">
                        <Link className="font-semibold text-archive-text100 hover:text-archive-gold300" href={`/decks/${encodeURIComponent(row.deckId)}`}>{row.name}</Link>
                        {row.description ? <p className="mt-1 max-w-xl text-xs text-archive-text500">{row.description}</p> : null}
                      </td>
                      <td className="px-4 py-4">{deckStatusLabelsFr[row.status]}</td>
                      <td className="px-4 py-4">{deckAllocationStrategyLabelsFr[row.allocationStrategy]}</td>
                      <td className="px-4 py-4 text-right tabular-nums">{row.deckCardLineCount}</td>
                      <td className="px-4 py-4 text-right tabular-nums">{row.requiredCardQuantity}</td>
                      <td className="px-4 py-4 text-right tabular-nums">{row.allocationLineCount}</td>
                      <td className="px-4 py-4 text-right tabular-nums">{row.allocatedCardQuantity}</td>
                      <td className="px-4 py-4">{formatDateTimeFr(row.updatedAt)}</td>
                      <td className="px-4 py-4"><Link className="font-semibold text-archive-gold300 hover:text-archive-text100" href={`/decks/${encodeURIComponent(row.deckId)}/edit`}>Modifier →</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
