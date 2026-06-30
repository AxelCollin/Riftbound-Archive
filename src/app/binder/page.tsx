import Link from "next/link";
import {
  cardKindLabelsFr,
  cardPrintTreatmentLabelsFr,
  cardRarityLabelsFr,
  cardVariantLabelsFr,
} from "@/lib/formatters/cards";
import { getBinderPageData } from "@/lib/queries/binder";

export const dynamic = "force-dynamic";

export default async function BinderPage() {
  const { rows, summary } = await getBinderPageData();
  const kpis = [
    { label: "Cartes suivies", value: summary.trackedRows, hint: "GAMEPLAY et ÉNERGIE uniquement" },
    { label: "Réservées", value: summary.reservedRows, hint: "Une copie automatique réservée" },
    { label: "Manquantes binder", value: summary.missingRows, hint: "Aucune copie éligible possédée" },
  ];

  return (
    <main className="min-h-screen px-8 py-6">
      <section className="mx-auto grid max-w-[var(--content-max)] gap-6">
        <header className="rounded-panel border border-[rgba(199,168,102,0.42)] bg-[rgba(8,17,27,0.88)] p-8 shadow-panel backdrop-blur">
          <nav className="flex flex-wrap gap-4 text-sm text-archive-gold300">
            <Link className="hover:text-archive-text100" href="/">← Accueil</Link>
            <Link className="hover:text-archive-text100" href="/collection">Collection →</Link>
          </nav>
          <p className="mt-6 text-sm uppercase tracking-[0.42em] text-archive-gold300">Réservations automatiques</p>
          <h1 className="mt-4 text-5xl font-semibold text-archive-text100">Binder</h1>
          <p className="mt-4 max-w-4xl text-base leading-7 text-archive-text300">
            Une ligne par carte suivie. Le binder réserve automatiquement une copie éligible quand elle est possédée.
            Cette vue est en lecture seule et ne crée aucun override ni flux d’édition.
          </p>
        </header>

        <div className="grid gap-4 md:grid-cols-3">
          {kpis.map((kpi) => (
            <article className="rounded-card border border-[rgba(199,168,102,0.28)] bg-[rgba(16,32,51,0.72)] p-5 shadow-panel" key={kpi.label}>
              <p className="text-sm text-archive-text300">{kpi.label}</p>
              <p className="mt-3 text-4xl font-semibold text-archive-gold300">{kpi.value}</p>
              <p className="mt-2 text-sm text-archive-text500">{kpi.hint}</p>
            </article>
          ))}
        </div>

        <section className="overflow-hidden rounded-panel border border-[rgba(199,168,102,0.34)] bg-[rgba(5,8,14,0.72)] shadow-panel">
          <div className="border-b border-[rgba(199,168,102,0.22)] p-5">
            <h2 className="text-2xl font-semibold text-archive-text100">Réservations automatiques</h2>
            <p className="mt-2 text-sm text-archive-text300">Les jetons et cartes de règles sont exclus. Les showcases ne sont jamais réservées automatiquement.</p>
          </div>
          {rows.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-xl font-semibold text-archive-gold300">Aucune carte suivie locale.</p>
              <p className="mt-3 text-archive-text300">Ajoutez ou synchronisez des cartes Riftbound pour afficher l’état du binder.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-left text-sm">
                <thead className="bg-[rgba(16,32,51,0.74)] text-xs uppercase tracking-[0.24em] text-archive-gold300">
                  <tr>
                    <th className="px-4 py-4">Carte</th>
                    <th className="px-4 py-4">Set</th>
                    <th className="px-4 py-4">N°</th>
                    <th className="px-4 py-4">Rareté</th>
                    <th className="px-4 py-4">Type</th>
                    <th className="px-4 py-4">Traitement</th>
                    <th className="px-4 py-4">Variante réservée</th>
                    <th className="px-4 py-4 text-right">Possédées normales</th>
                    <th className="px-4 py-4 text-right">Possédées foil</th>
                    <th className="px-4 py-4 text-right">Possédées showcase</th>
                    <th className="px-4 py-4">Statut binder</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[rgba(199,168,102,0.16)]">
                  {rows.map((row) => (
                    <tr className="text-archive-text300 hover:bg-[rgba(58,123,213,0.08)]" key={row.cardId}>
                      <td className="px-4 py-4 font-semibold text-archive-text100">{row.displayName}</td>
                      <td className="px-4 py-4"><span className="text-archive-gold300">{row.setCode}</span><span className="ml-2 text-archive-text500">{row.setName}</span></td>
                      <td className="px-4 py-4">{row.collectorNumber}</td>
                      <td className="px-4 py-4">{cardRarityLabelsFr[row.rarity]}</td>
                      <td className="px-4 py-4">{cardKindLabelsFr[row.kind]}</td>
                      <td className="px-4 py-4">{cardPrintTreatmentLabelsFr[row.printTreatment]}</td>
                      <td className="px-4 py-4">{row.reservedVariant ? cardVariantLabelsFr[row.reservedVariant] : "—"}</td>
                      <td className="px-4 py-4 text-right tabular-nums">{row.ownedNormal}</td>
                      <td className="px-4 py-4 text-right tabular-nums">{row.ownedFoil}</td>
                      <td className="px-4 py-4 text-right tabular-nums">{row.ownedShowcase}</td>
                      <td className="px-4 py-4"><span className={row.binderStatus === "RESERVED" ? "text-archive-success500" : "text-archive-warning500"}>{row.binderStatus === "RESERVED" ? "Réservée" : "Manquante"}</span></td>
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
