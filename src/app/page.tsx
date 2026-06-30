import Link from "next/link";

const kpis = [
  { label: "Cartes possédées", value: "0", hint: "Collection locale" },
  { label: "Cartes disponibles", value: "0", hint: "Après réservations" },
  { label: "Decks assemblés", value: "0", hint: "Cartes bloquées" },
  { label: "Boosters", value: "0", hint: "+1 par jour par défaut" },
];

export default function HomePage() {
  return (
    <main className="min-h-screen px-8 py-6">
      <section className="mx-auto grid max-w-[var(--content-max)] gap-6">
        <header className="rounded-panel border border-[rgba(199,168,102,0.42)] bg-[rgba(8,17,27,0.84)] p-8 shadow-panel backdrop-blur">
          <p className="text-sm uppercase tracking-[0.42em] text-archive-gold300">
            Riftbound Archive
          </p>
          <h1 className="mt-4 text-5xl font-semibold text-archive-text100">
            Gestion locale de collection et deckbuilding
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-archive-text300">
            Le socle Next.js, les règles métier testées et le schéma SQLite sont
            en place. Les prochains travaux commenceront par des données
            manuelles de seed/mock et les flux MVP de collection.
          </p>
        </header>

        <div className="flex flex-wrap gap-4">
          <Link
            className="w-fit rounded-chip border border-[rgba(199,168,102,0.42)] bg-[rgba(16,32,51,0.72)] px-5 py-3 text-sm font-semibold text-archive-gold300 shadow-panel transition hover:border-archive-gold300 hover:text-archive-text100"
            href="/collection"
          >
            Ouvrir la collection →
          </Link>
          <Link
            className="w-fit rounded-chip border border-[rgba(199,168,102,0.42)] bg-[rgba(16,32,51,0.72)] px-5 py-3 text-sm font-semibold text-archive-gold300 shadow-panel transition hover:border-archive-gold300 hover:text-archive-text100"
            href="/binder"
          >
            Ouvrir le binder →
          </Link>
          <Link
            className="w-fit rounded-chip border border-[rgba(199,168,102,0.42)] bg-[rgba(16,32,51,0.72)] px-5 py-3 text-sm font-semibold text-archive-gold300 shadow-panel transition hover:border-archive-gold300 hover:text-archive-text100"
            href="/decks"
          >
            Ouvrir les decks →
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {kpis.map((kpi) => (
            <article
              className="rounded-card border border-[rgba(199,168,102,0.28)] bg-[rgba(16,32,51,0.72)] p-5 shadow-panel"
              key={kpi.label}
            >
              <p className="text-sm text-archive-text300">{kpi.label}</p>
              <p className="mt-3 text-4xl font-semibold text-archive-gold300">{kpi.value}</p>
              <p className="mt-2 text-sm text-archive-text500">{kpi.hint}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
