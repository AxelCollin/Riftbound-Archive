import { notFound } from "next/navigation";
import Link from "next/link";

import { deleteDeckAction, updateDeckAction } from "@/app/decks/actions";
import { deckAllocationStrategyLabelsFr, deckStatusLabelsFr } from "@/lib/formatters/decks";
import { getDeckEditData } from "@/lib/queries/decks";

const allocationStrategies = ["PRESERVE_PREMIUM_VARIANTS", "EXACT_VARIANT", "ANY_VARIANT"] as const;

type EditDeckPageProps = {
  params: Promise<{ deckId: string }>;
};

export default async function EditDeckPage({ params }: EditDeckPageProps) {
  const { deckId } = await params;
  const deck = await getDeckEditData(deckId);

  if (!deck) {
    notFound();
  }

  const updateAction = updateDeckAction.bind(null, deck.deckId);
  const deleteAction = deleteDeckAction.bind(null, deck.deckId);

  return (
    <main className="min-h-screen px-8 py-6">
      <section className="mx-auto grid max-w-4xl gap-6">
        <Link className="text-sm text-archive-gold300 hover:text-archive-text100" href="/decks">← Retour aux decks</Link>
        <header className="rounded-panel border border-[rgba(199,168,102,0.42)] bg-[rgba(8,17,27,0.88)] p-8 shadow-panel">
          <p className="text-sm uppercase tracking-[0.42em] text-archive-gold300">Deckbuilding — Phase 6C</p>
          <h1 className="mt-4 text-5xl font-semibold text-archive-text100">Modifier le deck</h1>
          <p className="mt-4 text-base leading-7 text-archive-text300">Les cartes, allocations et changements de statut arriveront dans une prochaine étape.</p>
          <p className="mt-3 text-sm text-archive-text500">Statut actuel : {deckStatusLabelsFr[deck.status]}</p>
        </header>
        <form action={updateAction} className="grid gap-5 rounded-panel border border-[rgba(199,168,102,0.34)] bg-[rgba(5,8,14,0.72)] p-6 shadow-panel">
          <label className="grid gap-2 text-sm text-archive-text300">
            Nom
            <input className="rounded-card border border-[rgba(199,168,102,0.34)] bg-archive-bg900 px-4 py-3 text-archive-text100" defaultValue={deck.name} maxLength={120} name="name" required />
          </label>
          <label className="grid gap-2 text-sm text-archive-text300">
            Description
            <textarea className="min-h-28 rounded-card border border-[rgba(199,168,102,0.34)] bg-archive-bg900 px-4 py-3 text-archive-text100" defaultValue={deck.description ?? ""} name="description" />
          </label>
          <label className="grid gap-2 text-sm text-archive-text300">
            Stratégie d’allocation
            <select className="rounded-card border border-[rgba(199,168,102,0.34)] bg-archive-bg900 px-4 py-3 text-archive-text100" defaultValue={deck.allocationStrategy} name="allocationStrategy">
              {allocationStrategies.map((strategy) => (
                <option key={strategy} value={strategy}>{deckAllocationStrategyLabelsFr[strategy]}</option>
              ))}
            </select>
          </label>
          <button className="w-fit rounded-chip border border-[rgba(199,168,102,0.52)] bg-[rgba(199,168,102,0.16)] px-5 py-3 font-semibold text-archive-gold300 hover:text-archive-text100" type="submit">Enregistrer</button>
        </form>
        <section className="rounded-panel border border-[rgba(217,74,74,0.42)] bg-[rgba(5,8,14,0.72)] p-6 shadow-panel">
          <h2 className="text-2xl font-semibold text-archive-text100">Suppression</h2>
          <p className="mt-3 text-sm leading-6 text-archive-text300">Cette action supprime uniquement un deck vide. La suppression est autorisée seulement si le deck ne contient aucune exigence de carte et aucune allocation ; la Phase 6C ne gère pas la suppression des cartes de deck ni des allocations.</p>
          <form action={deleteAction} className="mt-5">
            <button className="rounded-chip border border-[rgba(217,74,74,0.58)] bg-[rgba(217,74,74,0.16)] px-5 py-3 font-semibold text-red-200 hover:text-white" type="submit">Supprimer le deck</button>
          </form>
        </section>
      </section>
    </main>
  );
}
