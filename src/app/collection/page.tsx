import Link from "next/link";
import { CollectionFilters } from "./CollectionFilters";
import { getCollectionPageData } from "@/lib/queries/collection";

export const dynamic = "force-dynamic";

export default async function CollectionPage() {
  const { rows, summary } = await getCollectionPageData();
  const kpis = [
    { label: "Copies possédées", value: summary.totalOwnedCopies, hint: "Somme des snapshots CollectionEntry" },
    { label: "Lignes possédées", value: summary.ownedRows, hint: "Cartes/variantes avec quantité > 0" },
    { label: "Lignes suivies", value: summary.trackableRows, hint: "GAMEPLAY et ÉNERGIE uniquement" },
    { label: "Lignes manquantes", value: summary.missingRows, hint: "Quantité locale égale à 0" },
  ];

  return (
    <main className="min-h-screen px-8 py-6">
      <section className="mx-auto grid max-w-[var(--content-max)] gap-6">
        <header className="rounded-panel border border-[rgba(199,168,102,0.42)] bg-[rgba(8,17,27,0.88)] p-8 shadow-panel backdrop-blur">
          <nav className="flex flex-wrap gap-4 text-sm text-archive-gold300">
            <Link className="hover:text-archive-text100" href="/">
              ← Accueil
            </Link>
            <Link className="hover:text-archive-text100" href="/binder">
              Binder →
            </Link>
          </nav>
          <p className="mt-6 text-sm uppercase tracking-[0.42em] text-archive-gold300">Collection</p>
          <h1 className="mt-4 text-5xl font-semibold text-archive-text100">Collection</h1>
          <p className="mt-4 max-w-4xl text-base leading-7 text-archive-text300">
            Vue locale en lecture seule de la collection possédée. Les quantités affichées viennent des snapshots
            CollectionEntry et restent séparées des données officielles des cartes.
          </p>
        </header>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {kpis.map((kpi) => (
            <article className="rounded-card border border-[rgba(199,168,102,0.28)] bg-[rgba(16,32,51,0.72)] p-5 shadow-panel" key={kpi.label}>
              <p className="text-sm text-archive-text300">{kpi.label}</p>
              <p className="mt-3 text-4xl font-semibold text-archive-gold300">{kpi.value}</p>
              <p className="mt-2 text-sm text-archive-text500">{kpi.hint}</p>
            </article>
          ))}
        </div>

        {rows.length === 0 ? (
          <section className="overflow-hidden rounded-panel border border-[rgba(199,168,102,0.34)] bg-[rgba(5,8,14,0.72)] shadow-panel">
            <div className="border-b border-[rgba(199,168,102,0.22)] p-5">
              <h2 className="text-2xl font-semibold text-archive-text100">Cartes suivies</h2>
              <p className="mt-2 text-sm text-archive-text300">Une ligne par carte et variante autorisée. Les jetons et cartes de règles sont exclus.</p>
            </div>
            <div className="p-10 text-center">
              <p className="text-xl font-semibold text-archive-gold300">Aucune carte officielle locale.</p>
              <p className="mt-3 text-archive-text300">Exécutez le seed mock local pour remplir les premières cartes Riftbound, puis revenez sur cette page.</p>
            </div>
          </section>
        ) : (
          <CollectionFilters rows={rows} />
        )}
      </section>
    </main>
  );
}
