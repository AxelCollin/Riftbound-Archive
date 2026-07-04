import Link from "next/link";

import { recordBoosterOpeningAction, updateBoosterSettingsAction } from "./actions";
import { getBoosterOverview } from "@/lib/services/boosters";

export const dynamic = "force-dynamic";

type BoostersPageProps = {
  searchParams?: Promise<{ updated?: string; error?: string; openingRecorded?: string; openingError?: string }>;
};

export default async function BoostersPage({ searchParams }: BoostersPageProps = {}) {
  const params = await searchParams;
  const settings = await getBoosterOverview();

  return (
    <main className="min-h-screen px-8 py-6">
      <section className="mx-auto grid max-w-[var(--content-max)] gap-6">
        <header className="rounded-panel border border-[rgba(199,168,102,0.42)] bg-[rgba(8,17,27,0.88)] p-8 shadow-panel backdrop-blur">
          <nav className="flex flex-wrap gap-4 text-sm text-archive-gold300">
            <Link className="hover:text-archive-text100" href="/">← Accueil</Link>
            <Link className="hover:text-archive-text100" href="/collection">Collection →</Link>
            <Link className="hover:text-archive-text100" href="/decks">Decks →</Link>
          </nav>
          <p className="mt-6 text-sm uppercase tracking-[0.42em] text-archive-gold300">Boosters — Phase 7C</p>
          <h1 className="mt-4 text-5xl font-semibold text-archive-text100">Paramètres des boosters</h1>
          <p className="mt-4 max-w-4xl text-base leading-7 text-archive-text300">
            Le compteur accumulé est calculé depuis le journal, et vous pouvez maintenant enregistrer une ouverture sans modifier automatiquement la collection.
          </p>
        </header>

        {params?.updated ? (
          <p className="rounded-card border border-[rgba(121,184,90,0.42)] bg-[rgba(121,184,90,0.12)] p-4 text-sm font-semibold text-archive-text100">Paramètres des boosters enregistrés.</p>
        ) : null}
        {params?.error ? (
          <p role="alert" className="rounded-card border border-[rgba(217,74,74,0.52)] bg-[rgba(217,74,74,0.14)] p-4 text-sm font-semibold text-archive-text100">{params.error}</p>
        ) : null}
        {params?.openingRecorded ? (
          <p className="rounded-card border border-[rgba(121,184,90,0.42)] bg-[rgba(121,184,90,0.12)] p-4 text-sm font-semibold text-archive-text100">Ouverture de boosters enregistrée.</p>
        ) : null}
        {params?.openingError ? (
          <p role="alert" className="rounded-card border border-[rgba(217,74,74,0.52)] bg-[rgba(217,74,74,0.14)] p-4 text-sm font-semibold text-archive-text100">{params.openingError}</p>
        ) : null}

        <section className="rounded-panel border border-[rgba(199,168,102,0.34)] bg-[rgba(5,8,14,0.72)] p-6 shadow-panel">
          <div className="grid gap-4 md:grid-cols-4">
            <article className="rounded-card border border-[rgba(199,168,102,0.38)] bg-[rgba(16,32,51,0.82)] p-5">
              <p className="text-sm text-archive-text300">Compteur actuel</p>
              <p className="mt-3 text-4xl font-semibold text-archive-gold300">{settings.counter.accumulatedBoosters}</p>
              <p className="mt-2 text-xs uppercase tracking-[0.22em] text-archive-text500">Boosters disponibles</p>
            </article>
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

          <div className="mt-6 rounded-card border border-[rgba(58,123,213,0.28)] bg-[rgba(58,123,213,0.10)] p-4 text-sm text-archive-text300">
            Calculé depuis le dernier point d’ancrage : <span className="font-semibold text-archive-text100">{settings.counter.accrualAnchorAt}</span> (UTC). {settings.counter.completeIntervals} intervalle(s) complet(s) comptabilisé(s).
          </div>

          <form action={updateBoosterSettingsAction} className="mt-8 grid max-w-2xl gap-5">
            <label className="grid gap-2 text-sm font-semibold text-archive-text100">
              Gain quotidien
              <input
                className="rounded-card border border-[rgba(199,168,102,0.32)] bg-[rgba(8,17,27,0.92)] px-4 py-3 text-archive-text100"
                defaultValue={settings.boostersPerInterval}
                min={0}
                name="boostersPerInterval"
                required
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
              Ce réglage sert de valeur par défaut pour la nouvelle section d’ouverture.
            </div>

            <button className="w-fit rounded-chip border border-[rgba(199,168,102,0.52)] bg-[rgba(199,168,102,0.16)] px-5 py-3 font-semibold text-archive-gold300 hover:text-archive-text100" type="submit">
              Enregistrer les paramètres
            </button>
          </form>
        </section>

        <section className="rounded-panel border border-[rgba(199,168,102,0.34)] bg-[rgba(5,8,14,0.72)] p-6 shadow-panel">
          <div className="max-w-3xl">
            <p className="text-sm uppercase tracking-[0.32em] text-archive-gold300">Phase 7C</p>
            <h2 className="mt-3 text-3xl font-semibold text-archive-text100">Enregistrer une ouverture</h2>
            <p className="mt-3 text-sm leading-6 text-archive-text300">
              Cette phase enregistre l’ouverture et le compteur. Les cartes ne sont pas encore ajoutées automatiquement à la collection.
              {" "}Le détail des cartes ouvertes sera ajouté dans une phase suivante.
            </p>
          </div>

          <form action={recordBoosterOpeningAction} className="mt-8 grid max-w-2xl gap-5">
            <label className="grid gap-2 text-sm font-semibold text-archive-text100">
              Boosters ouverts
              <input
                className="rounded-card border border-[rgba(199,168,102,0.32)] bg-[rgba(8,17,27,0.92)] px-4 py-3 text-archive-text100"
                defaultValue={1}
                min={1}
                name="boosterCount"
                required
                step={1}
                type="number"
              />
            </label>

            <label className="flex items-start gap-3 rounded-card border border-[rgba(199,168,102,0.22)] bg-[rgba(16,32,51,0.48)] p-4 text-sm font-semibold text-archive-text100">
              <input className="mt-1" defaultChecked={settings.autoDecrementOnOpening} name="decrementCounter" type="checkbox" />
              <span>
                Décrémenter le compteur
                <span className="mt-1 block font-normal text-archive-text300">Si activé, un événement de compteur négatif est ajouté. Le compteur peut devenir négatif.</span>
              </span>
            </label>

            <label className="grid gap-2 text-sm font-semibold text-archive-text100">
              Note
              <textarea
                className="min-h-28 rounded-card border border-[rgba(199,168,102,0.32)] bg-[rgba(8,17,27,0.92)] px-4 py-3 text-archive-text100"
                name="note"
                placeholder="Contexte, produit ouvert, remarques…"
              />
            </label>

            <button className="w-fit rounded-chip border border-[rgba(199,168,102,0.52)] bg-[rgba(199,168,102,0.16)] px-5 py-3 font-semibold text-archive-gold300 hover:text-archive-text100" type="submit">
              Enregistrer l’ouverture
            </button>
          </form>

          {settings.recentOpenings.length > 0 ? (
            <div className="mt-8">
              <h3 className="text-lg font-semibold text-archive-text100">Ouvertures récentes</h3>
              <ul className="mt-3 grid gap-3">
                {settings.recentOpenings.map((opening) => (
                  <li className="rounded-card border border-[rgba(199,168,102,0.22)] bg-[rgba(16,32,51,0.48)] p-4 text-sm text-archive-text300" key={opening.id}>
                    <span className="font-semibold text-archive-text100">{opening.boosterCount} booster(s)</span> — {opening.openedAt} — {opening.decrementCounter ? "compteur décrémenté" : "compteur inchangé"}
                    {opening.note ? <span className="block pt-1">{opening.note}</span> : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      </section>
    </main>
  );
}
