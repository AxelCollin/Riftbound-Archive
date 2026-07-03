import Link from "next/link";

import { updateBoosterSettingsAction } from "./actions";
import { getBoosterSettings } from "@/lib/services/boosters";

export const dynamic = "force-dynamic";

type BoostersPageProps = {
  searchParams?: Promise<{ updated?: string; error?: string }>;
};

export default async function BoostersPage({ searchParams }: BoostersPageProps = {}) {
  const params = await searchParams;
  const settings = await getBoosterSettings();

  return (
    <main className="min-h-screen px-8 py-6">
      <section className="mx-auto grid max-w-[var(--content-max)] gap-6">
        <header className="rounded-panel border border-[rgba(199,168,102,0.42)] bg-[rgba(8,17,27,0.88)] p-8 shadow-panel backdrop-blur">
          <nav className="flex flex-wrap gap-4 text-sm text-archive-gold300">
            <Link className="hover:text-archive-text100" href="/">← Accueil</Link>
            <Link className="hover:text-archive-text100" href="/collection">Collection →</Link>
            <Link className="hover:text-archive-text100" href="/decks">Decks →</Link>
          </nav>
          <p className="mt-6 text-sm uppercase tracking-[0.42em] text-archive-gold300">Boosters — Phase 7A</p>
          <h1 className="mt-4 text-5xl font-semibold text-archive-text100">Paramètres des boosters</h1>
          <p className="mt-4 max-w-4xl text-base leading-7 text-archive-text300">
            Ces paramètres préparent le compteur ; le calcul accumulé et l’ouverture de boosters arrivent dans les prochaines phases.
          </p>
        </header>

        {params?.updated ? (
          <p className="rounded-card border border-[rgba(121,184,90,0.42)] bg-[rgba(121,184,90,0.12)] p-4 text-sm font-semibold text-archive-text100">Paramètres des boosters enregistrés.</p>
        ) : null}
        {params?.error ? (
          <p role="alert" className="rounded-card border border-[rgba(217,74,74,0.52)] bg-[rgba(217,74,74,0.14)] p-4 text-sm font-semibold text-archive-text100">{params.error}</p>
        ) : null}

        <section className="rounded-panel border border-[rgba(199,168,102,0.34)] bg-[rgba(5,8,14,0.72)] p-6 shadow-panel">
          <div className="grid gap-4 md:grid-cols-3">
            <article className="rounded-card border border-[rgba(199,168,102,0.28)] bg-[rgba(16,32,51,0.72)] p-5">
              <p className="text-sm text-archive-text300">Gain quotidien</p>
              <p className="mt-3 text-4xl font-semibold text-archive-gold300">+{settings.boostersPerInterval}</p>
            </article>
            <article className="rounded-card border border-[rgba(199,168,102,0.28)] bg-[rgba(16,32,51,0.72)] p-5">
              <p className="text-sm text-archive-text300">Fréquence</p>
              <p className="mt-3 text-4xl font-semibold text-archive-gold300">Chaque jour</p>
            </article>
            <article className="rounded-card border border-[rgba(199,168,102,0.28)] bg-[rgba(16,32,51,0.72)] p-5">
              <p className="text-sm text-archive-text300">Ouverture</p>
              <p className="mt-3 text-2xl font-semibold text-archive-gold300">{settings.autoDecrementOnOpening ? "Décrémente" : "Ne décrémente pas"}</p>
            </article>
          </div>

          <form action={updateBoosterSettingsAction} className="mt-8 grid max-w-2xl gap-5">
            <label className="grid gap-2 text-sm font-semibold text-archive-text100">
              Gain quotidien
              <input
                className="rounded-card border border-[rgba(199,168,102,0.32)] bg-[rgba(8,17,27,0.92)] px-4 py-3 text-archive-text100"
                defaultValue={settings.boostersPerInterval}
                min={0}
                name="boostersPerInterval"
                step={1}
                type="number"
              />
            </label>

            <label className="flex items-start gap-3 rounded-card border border-[rgba(199,168,102,0.22)] bg-[rgba(16,32,51,0.48)] p-4 text-sm font-semibold text-archive-text100">
              <input className="mt-1" defaultChecked={settings.autoDecrementOnOpening} name="autoDecrementOnOpening" type="checkbox" />
              <span>
                Décrémenter le compteur lors d’une ouverture
                <span className="mt-1 block font-normal text-archive-text300">Ce réglage servira de valeur par défaut quand le flux d’ouverture sera ajouté.</span>
              </span>
            </label>

            <div className="rounded-card border border-[rgba(58,123,213,0.28)] bg-[rgba(58,123,213,0.10)] p-4 text-sm text-archive-text300">
              Aucun formulaire d’ouverture de booster n’est disponible dans cette phase.
            </div>

            <button className="w-fit rounded-chip border border-[rgba(199,168,102,0.52)] bg-[rgba(199,168,102,0.16)] px-5 py-3 font-semibold text-archive-gold300 hover:text-archive-text100" type="submit">
              Enregistrer les paramètres
            </button>
          </form>
        </section>
      </section>
    </main>
  );
}
