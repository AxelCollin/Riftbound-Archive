import Link from "next/link";

import { recordBoosterOpeningAction, rollbackBoosterOpeningAction, updateBoosterSettingsAction } from "./actions";
import { getBoosterOpeningSummary, getBoosterOverview } from "@/lib/services/boosters";

export const dynamic = "force-dynamic";

type BoostersPageProps = {
  searchParams?: Promise<{ updated?: string; error?: string; openingRecorded?: string; openingError?: string; rollbackRecorded?: string; rollbackError?: string; opened?: string | string[] }>;
};

function normalizeOpenedQueryParam(opened: string | string[] | undefined): string | undefined {
  return typeof opened === "string" ? opened : undefined;
}

export default async function BoostersPage({ searchParams }: BoostersPageProps = {}) {
  const params = await searchParams;
  const openedOpeningId = normalizeOpenedQueryParam(params?.opened);
  const [settings, openingSummary] = await Promise.all([getBoosterOverview(), getBoosterOpeningSummary(openedOpeningId)]);

  return (
    <main className="min-h-screen px-8 py-6">
      <section className="mx-auto grid max-w-[var(--content-max)] gap-6">
        <header className="rounded-panel border border-[rgba(199,168,102,0.42)] bg-[rgba(8,17,27,0.88)] p-8 shadow-panel backdrop-blur">
          <nav className="flex flex-wrap gap-4 text-sm text-archive-gold300">
            <Link className="hover:text-archive-text100" href="/">← Accueil</Link>
            <Link className="hover:text-archive-text100" href="/collection">Collection →</Link>
            <Link className="hover:text-archive-text100" href="/decks">Decks →</Link>
          </nav>
          <p className="mt-6 text-sm uppercase tracking-[0.42em] text-archive-gold300">Boosters</p>
          <h1 className="mt-4 text-5xl font-semibold text-archive-text100">Paramètres des boosters</h1>
          <p className="mt-4 max-w-4xl text-base leading-7 text-archive-text300">
            Le compteur accumulé est calculé depuis le journal, les cartes ouvertes sont ajoutées à la collection, et une ouverture peut être annulée tant que l’annulation reste sûre.
          </p>
        </header>

        {params?.updated ? (
          <p className="rounded-card border border-[rgba(121,184,90,0.42)] bg-[rgba(121,184,90,0.12)] p-4 text-sm font-semibold text-archive-text100">Paramètres des boosters enregistrés.</p>
        ) : null}
        {params?.error ? (
          <p role="alert" className="rounded-card border border-[rgba(217,74,74,0.52)] bg-[rgba(217,74,74,0.14)] p-4 text-sm font-semibold text-archive-text100">{params.error}</p>
        ) : null}
        {params?.openingRecorded ? (
          <p className="rounded-card border border-[rgba(121,184,90,0.42)] bg-[rgba(121,184,90,0.12)] p-4 text-sm font-semibold text-archive-text100">Ouverture de boosters enregistrée et cartes ajoutées à la collection.</p>
        ) : null}
        {params?.openingError ? (
          <p role="alert" className="rounded-card border border-[rgba(217,74,74,0.52)] bg-[rgba(217,74,74,0.14)] p-4 text-sm font-semibold text-archive-text100">{params.openingError}</p>
        ) : null}
        {params?.rollbackRecorded ? (
          <p className="rounded-card border border-[rgba(121,184,90,0.42)] bg-[rgba(121,184,90,0.12)] p-4 text-sm font-semibold text-archive-text100">Ouverture annulée.</p>
        ) : null}
        {params?.rollbackError ? (
          <p role="alert" className="rounded-card border border-[rgba(217,74,74,0.52)] bg-[rgba(217,74,74,0.14)] p-4 text-sm font-semibold text-archive-text100">{params.rollbackError}</p>
        ) : null}

        {params?.opened && !openingSummary ? (
          <p role="status" className="rounded-card border border-[rgba(217,167,74,0.48)] bg-[rgba(217,167,74,0.12)] p-4 text-sm font-semibold text-archive-text100">Résumé d’ouverture introuvable pour cet identifiant.</p>
        ) : null}

        {openingSummary ? (
          <section className="rounded-panel border border-[rgba(199,168,102,0.42)] bg-[rgba(5,8,14,0.78)] p-6 shadow-panel">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.32em] text-archive-gold300">Résumé de l’ouverture</p>
                <h2 className="mt-3 text-3xl font-semibold text-archive-text100">Cartes ajoutées</h2>
                <p className="mt-2 text-sm text-archive-text300">Résumé lu depuis les lignes persistées de l’ouverture, sans prix ni valeur.</p>
              </div>
              <div className="flex flex-wrap gap-2"><p className="rounded-chip border border-[rgba(58,123,213,0.32)] bg-[rgba(58,123,213,0.12)] px-4 py-2 text-sm font-semibold text-archive-text100">{openingSummary.decrementCounter ? "Compteur décrémenté" : "Compteur inchangé"}</p><p className="rounded-chip border border-[rgba(199,168,102,0.32)] bg-[rgba(199,168,102,0.10)] px-4 py-2 text-sm font-semibold text-archive-text100">{openingSummary.status === "ROLLED_BACK" ? "Ouverture annulée" : "Ouverture enregistrée"}</p></div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3 xl:grid-cols-6">
              <article className="rounded-card border border-[rgba(199,168,102,0.28)] bg-[rgba(16,32,51,0.68)] p-4"><p className="text-xs uppercase tracking-[0.18em] text-archive-text500">Boosters ouverts</p><p className="mt-2 text-3xl font-semibold text-archive-gold300">{openingSummary.boosterCount}</p></article>
              <article className="rounded-card border border-[rgba(199,168,102,0.28)] bg-[rgba(16,32,51,0.68)] p-4"><p className="text-xs uppercase tracking-[0.18em] text-archive-text500">Cartes enregistrées</p><p className="mt-2 text-3xl font-semibold text-archive-gold300">{openingSummary.distinctCardRows}</p></article>
              <article className="rounded-card border border-[rgba(199,168,102,0.28)] bg-[rgba(16,32,51,0.68)] p-4"><p className="text-xs uppercase tracking-[0.18em] text-archive-text500">Quantité totale</p><p className="mt-2 text-3xl font-semibold text-archive-gold300">{openingSummary.totalCardQuantity}</p></article>
              <article className="rounded-card border border-[rgba(199,168,102,0.28)] bg-[rgba(16,32,51,0.68)] p-4"><p className="text-xs uppercase tracking-[0.18em] text-archive-text500">Nouvelles entrées de collection</p><p className="mt-2 text-3xl font-semibold text-archive-gold300">{openingSummary.newlyCreatedCollectionEntries}</p></article>
              <article className="rounded-card border border-[rgba(199,168,102,0.28)] bg-[rgba(16,32,51,0.68)] p-4"><p className="text-xs uppercase tracking-[0.18em] text-archive-text500">Entrées existantes incrémentées</p><p className="mt-2 text-3xl font-semibold text-archive-gold300">{openingSummary.incrementedCollectionEntries}</p></article>
              <article className="rounded-card border border-[rgba(199,168,102,0.28)] bg-[rgba(16,32,51,0.68)] p-4"><p className="text-xs uppercase tracking-[0.18em] text-archive-text500">Cartes ajoutées</p><p className="mt-2 text-3xl font-semibold text-archive-gold300">{openingSummary.totalCardsAddedToCollection}</p></article>
            </div>

            <div className="mt-6 overflow-hidden rounded-card border border-[rgba(199,168,102,0.24)]">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-[rgba(199,168,102,0.12)] text-xs uppercase tracking-[0.18em] text-archive-gold300"><tr><th className="px-4 py-3">Carte</th><th className="px-4 py-3">Set</th><th className="px-4 py-3">Variante</th><th className="px-4 py-3">Quantité</th><th className="px-4 py-3">Collection actuelle</th></tr></thead>
                <tbody>
                  {openingSummary.pulls.length > 0 ? openingSummary.pulls.map((pull) => (
                    <tr className="border-t border-[rgba(199,168,102,0.14)] text-archive-text300" key={`${pull.cardId}:${pull.variant}`}><td className="px-4 py-3 font-semibold text-archive-text100">{pull.displayName}</td><td className="px-4 py-3">{pull.setCode ?? "—"}{pull.collectorNumber ? ` #${pull.collectorNumber}` : ""}</td><td className="px-4 py-3">{pull.variant}</td><td className="px-4 py-3">{pull.quantity}</td><td className="px-4 py-3">{pull.collectionQuantityAfterOpening} · {pull.wasNewCollectionEntry ? "nouvelle entrée" : "entrée incrémentée"}</td></tr>
                  )) : (
                    <tr className="border-t border-[rgba(199,168,102,0.14)] text-archive-text300"><td className="px-4 py-4" colSpan={5}>Aucune carte enregistrée pour cette ouverture.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-4 rounded-card border border-[rgba(217,167,74,0.38)] bg-[rgba(217,167,74,0.10)] p-4 text-sm text-archive-text300">
              <p className="font-semibold text-archive-text100">Annulation</p>
              <p className="mt-2">Annuler cette ouverture inverse uniquement les quantités de collection et le décrément de compteur liés à cette ouverture. Aucun prix ni valeur n’est recalculé ou annulé.</p>
              {openingSummary.canRollback ? (
                <form action={rollbackBoosterOpeningAction} className="mt-4">
                  <input name="openingId" type="hidden" value={openingSummary.id} />
                  <button className="rounded-chip border border-[rgba(217,74,74,0.52)] bg-[rgba(217,74,74,0.14)] px-5 py-3 font-semibold text-archive-text100 hover:text-archive-gold300" type="submit">Annuler cette ouverture</button>
                </form>
              ) : (
                <p className="mt-3 font-semibold text-archive-text100">{openingSummary.rollbackBlockedReason ?? "Annulation indisponible"}</p>
              )}
            </div>
          </section>
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
                <span className="mt-1 block font-normal text-archive-text300">Ce réglage sert de valeur par défaut pour les prochaines ouvertures.</span>
              </span>
            </label>

            <div className="rounded-card border border-[rgba(58,123,213,0.28)] bg-[rgba(58,123,213,0.10)] p-4 text-sm text-archive-text300">
              Les prochaines ouvertures utiliseront ce choix par défaut, avec possibilité de le modifier au moment de l’enregistrement.
            </div>

            <button className="w-fit rounded-chip border border-[rgba(199,168,102,0.52)] bg-[rgba(199,168,102,0.16)] px-5 py-3 font-semibold text-archive-gold300 hover:text-archive-text100" type="submit">
              Enregistrer les paramètres
            </button>
          </form>
        </section>

        <section className="rounded-panel border border-[rgba(199,168,102,0.34)] bg-[rgba(5,8,14,0.72)] p-6 shadow-panel">
          <div className="max-w-3xl">
            <p className="text-sm uppercase tracking-[0.32em] text-archive-gold300">Ouverture de boosters</p>
            <h2 className="mt-3 text-3xl font-semibold text-archive-text100">Enregistrer une ouverture</h2>
            <p className="mt-3 text-sm leading-6 text-archive-text300">
              Enregistrer l’ouverture, les cartes ouvertes et les transactions de collection correspondantes. Les lignes vides sont ignorées ; une ligne partiellement remplie est refusée.
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
            <div className="grid gap-4 rounded-card border border-[rgba(58,123,213,0.28)] bg-[rgba(58,123,213,0.10)] p-4">
              <div>
                <h3 className="text-lg font-semibold text-archive-text100">Cartes ouvertes</h3>
                <p className="mt-1 text-sm text-archive-text300">Ajouter à la collection les cartes GAMEPLAY ou ENERGY saisies ci-dessous.</p>
              </div>
              <div className="grid gap-3">
                {Array.from({ length: 5 }, (_, index) => (
                  <div className="grid gap-3 rounded-card border border-[rgba(199,168,102,0.18)] bg-[rgba(8,17,27,0.48)] p-3 md:grid-cols-[1fr_10rem_8rem]" key={index}>
                    <label className="grid gap-2 text-sm font-semibold text-archive-text100">
                      Carte
                      <select className="rounded-card border border-[rgba(199,168,102,0.32)] bg-[rgba(8,17,27,0.92)] px-3 py-2 text-archive-text100" name={`pulls.${index}.cardId`}>
                        <option value="">— Aucune carte —</option>
                        {settings.cardOptions.map((card) => (
                          <option key={card.cardId} value={card.cardId}>{card.displayName}</option>
                        ))}
                      </select>
                    </label>
                    <label className="grid gap-2 text-sm font-semibold text-archive-text100">
                      Variante
                      <select className="rounded-card border border-[rgba(199,168,102,0.32)] bg-[rgba(8,17,27,0.92)] px-3 py-2 text-archive-text100" name={`pulls.${index}.variant`}>
                        <option value="">—</option>
                        <option value="NORMAL">Normale</option>
                        <option value="FOIL">Foil</option>
                        <option value="SHOWCASE">Showcase</option>
                      </select>
                    </label>
                    <label className="grid gap-2 text-sm font-semibold text-archive-text100">
                      Quantité
                      <input className="rounded-card border border-[rgba(199,168,102,0.32)] bg-[rgba(8,17,27,0.92)] px-3 py-2 text-archive-text100" min={1} name={`pulls.${index}.quantity`} step={1} type="number" />
                    </label>
                  </div>
                ))}
              </div>
            </div>


            <button className="w-fit rounded-chip border border-[rgba(199,168,102,0.52)] bg-[rgba(199,168,102,0.16)] px-5 py-3 font-semibold text-archive-gold300 hover:text-archive-text100" type="submit">
              Ajouter à la collection
            </button>
          </form>

          {settings.recentOpenings.length > 0 ? (
            <div className="mt-8">
              <h3 className="text-lg font-semibold text-archive-text100">Ouvertures récentes</h3>
              <ul className="mt-3 grid gap-3">
                {settings.recentOpenings.map((opening) => (
                  <li className="rounded-card border border-[rgba(199,168,102,0.22)] bg-[rgba(16,32,51,0.48)] p-4 text-sm text-archive-text300" key={opening.id}>
                    <span className="font-semibold text-archive-text100">{opening.boosterCount} booster(s)</span> — {opening.openedAt} — {opening.decrementCounter ? "compteur décrémenté" : "compteur inchangé"} — {opening.status === "ROLLED_BACK" ? "annulée" : "enregistrée"}
                    <span className="block pt-1">{opening.recordedCardCount > 0 ? `${opening.recordedCardCount} ligne(s) de cartes enregistrée(s)` : "Aucune carte enregistrée"}</span>
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
