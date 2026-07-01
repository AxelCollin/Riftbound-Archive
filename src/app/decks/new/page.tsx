import Link from "next/link";

import { createDeckAction } from "@/app/decks/actions";
import { DEFAULT_DECK_ALLOCATION_STRATEGY } from "@/lib/domain/deck-write";
import { deckAllocationStrategyLabelsFr } from "@/lib/formatters/decks";

const allocationStrategies = ["PRESERVE_PREMIUM_VARIANTS", "EXACT_VARIANT", "ANY_VARIANT"] as const;

export default function NewDeckPage() {
  return (
    <main className="min-h-screen px-8 py-6">
      <section className="mx-auto grid max-w-4xl gap-6">
        <Link className="text-sm text-archive-gold300 hover:text-archive-text100" href="/decks">← Retour aux decks</Link>
        <header className="rounded-panel border border-[rgba(199,168,102,0.42)] bg-[rgba(8,17,27,0.88)] p-8 shadow-panel">
          <p className="text-sm uppercase tracking-[0.42em] text-archive-gold300">Deckbuilding — Phase 6C</p>
          <h1 className="mt-4 text-5xl font-semibold text-archive-text100">Nouveau deck</h1>
          <p className="mt-4 text-base leading-7 text-archive-text300">Créer un deck vide. Les cartes seront ajoutées dans une prochaine étape.</p>
        </header>
        <form action={createDeckAction} className="grid gap-5 rounded-panel border border-[rgba(199,168,102,0.34)] bg-[rgba(5,8,14,0.72)] p-6 shadow-panel">
          <label className="grid gap-2 text-sm text-archive-text300">
            Nom
            <input className="rounded-card border border-[rgba(199,168,102,0.34)] bg-archive-bg900 px-4 py-3 text-archive-text100" maxLength={120} name="name" required />
          </label>
          <label className="grid gap-2 text-sm text-archive-text300">
            Description
            <textarea className="min-h-28 rounded-card border border-[rgba(199,168,102,0.34)] bg-archive-bg900 px-4 py-3 text-archive-text100" name="description" />
          </label>
          <label className="grid gap-2 text-sm text-archive-text300">
            Stratégie d’allocation
            <select className="rounded-card border border-[rgba(199,168,102,0.34)] bg-archive-bg900 px-4 py-3 text-archive-text100" defaultValue={DEFAULT_DECK_ALLOCATION_STRATEGY} name="allocationStrategy">
              {allocationStrategies.map((strategy) => (
                <option key={strategy} value={strategy}>{deckAllocationStrategyLabelsFr[strategy]}</option>
              ))}
            </select>
          </label>
          <button className="w-fit rounded-chip border border-[rgba(199,168,102,0.52)] bg-[rgba(199,168,102,0.16)] px-5 py-3 font-semibold text-archive-gold300 hover:text-archive-text100" type="submit">Créer le deck</button>
        </form>
      </section>
    </main>
  );
}
