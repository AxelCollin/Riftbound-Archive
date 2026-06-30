import Link from "next/link";
import { notFound } from "next/navigation";
import { cardVariantLabelsFr } from "@/lib/formatters/cards";
import { getCardAvailabilityExplanationFromRouteParam } from "@/lib/queries/card-availability";

export const dynamic = "force-dynamic";

type CardAvailabilityPageProps = {
  params: Promise<{ cardId: string }>;
};

const reasonLabels: Record<string, string> = {
  NO_OWNED_COPIES: "Aucune copie possédée pour cette variante.",
  BINDER_RESERVED_COPIES: "Le binder réserve des copies avant le deckbuilding.",
  ASSEMBLED_DECK_ALLOCATED_COPIES: "Des decks assemblés bloquent physiquement des copies.",
  AVAILABLE_AFTER_RESERVATIONS: "Il reste au moins une copie après réservations et allocations.",
  APP_VALUE_CLAMPED_TO_ZERO: "La valeur affichée par l’app est ramenée à 0 quand la formule brute est négative.",
};

export default async function CardAvailabilityPage({ params }: CardAvailabilityPageProps) {
  const { cardId } = await params;
  const explanation = await getCardAvailabilityExplanationFromRouteParam(cardId);

  if (!explanation) {
    notFound();
  }

  const cardHref = `/cards/${encodeURIComponent(explanation.cardId)}`;

  return (
    <main className="min-h-screen px-8 py-6">
      <section className="mx-auto grid max-w-[var(--content-max)] gap-6">
        <header className="rounded-panel border border-[rgba(199,168,102,0.42)] bg-[rgba(8,17,27,0.88)] p-8 shadow-panel backdrop-blur">
          <Link className="text-sm text-archive-gold300 hover:text-archive-text100" href={cardHref}>
            ← Retour à la carte
          </Link>
          <p className="mt-6 text-sm uppercase tracking-[0.42em] text-archive-gold300">
            {explanation.set.code} · {explanation.collectorNumber}
          </p>
          <h1 className="mt-4 text-5xl font-semibold text-archive-text100">Disponibilité</h1>
          <p className="mt-4 max-w-4xl text-base leading-7 text-archive-text300">
            Pourquoi cette carte est disponible ou non. Cette page est en lecture seule et ne permet aucune édition.
          </p>
        </header>

        <section className="rounded-panel border border-[rgba(199,168,102,0.34)] bg-[rgba(5,8,14,0.72)] p-6 shadow-panel">
          <h2 className="text-2xl font-semibold text-archive-text100">Résumé</h2>
          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            <Info label="Carte" value={explanation.displayName} />
            <Info label="Set" value={`${explanation.set.code} — ${explanation.set.name}`} />
            <Info label="Formule brute" value="possédées - réservées binder - allouées decks assemblés" />
          </div>
          <p className="mt-5 rounded-card border border-[rgba(199,168,102,0.22)] bg-[rgba(16,32,51,0.52)] p-4 text-sm leading-6 text-archive-text300">
            Les réservations binder retirent des copies de la disponibilité. Les decks avec le statut assemblé retirent aussi leurs copies allouées. La valeur affichée par l’app est une valeur sûre ramenée à 0 lorsque la formule brute devient négative.
          </p>
        </section>

        <section className="rounded-panel border border-[rgba(199,168,102,0.34)] bg-[rgba(5,8,14,0.72)] p-6 shadow-panel">
          <h2 className="text-2xl font-semibold text-archive-text100">Détail par variante</h2>
          {explanation.isTrackable ? (
            <div className="mt-5 overflow-hidden rounded-card border border-[rgba(199,168,102,0.22)]">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-[rgba(16,32,51,0.86)] text-xs uppercase tracking-[0.22em] text-archive-gold300">
                  <tr>
                    <th className="px-5 py-4">Variante</th>
                    <th className="px-5 py-4 text-right">Possédées</th>
                    <th className="px-5 py-4 text-right">Réservées binder</th>
                    <th className="px-5 py-4 text-right">Allouées decks assemblés</th>
                    <th className="px-5 py-4 text-right">Formule brute</th>
                    <th className="px-5 py-4 text-right">Valeur affichée</th>
                    <th className="px-5 py-4">Statut</th>
                    <th className="px-5 py-4">Raisons</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[rgba(199,168,102,0.14)]">
                  {explanation.rows.map((row) => (
                    <tr className="align-top text-archive-text300" key={row.variant}>
                      <td className="px-5 py-4 font-semibold text-archive-gold300">{cardVariantLabelsFr[row.variant]}</td>
                      <td className="px-5 py-4 text-right text-lg font-semibold text-archive-text100">{row.ownedQuantity}</td>
                      <td className="px-5 py-4 text-right text-lg font-semibold text-archive-gold300">{row.binderReservedQuantity}</td>
                      <td className="px-5 py-4 text-right text-lg font-semibold text-archive-text100">{row.assembledDeckAllocatedQuantity}</td>
                      <td className="px-5 py-4 text-right text-lg font-semibold text-archive-text100">{row.rawAvailableQuantity}</td>
                      <td className="px-5 py-4 text-right text-lg font-semibold text-archive-text100">{row.availableQuantity}</td>
                      <td className="px-5 py-4">
                        <span className={row.status === "AVAILABLE" ? "text-archive-success500" : "text-archive-danger500"}>
                          {row.status === "AVAILABLE" ? "Disponible" : "Indisponible"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <ul className="grid gap-1">
                          {row.reasons.map((reason) => (
                            <li key={reason}>{reasonLabels[reason]}</li>
                          ))}
                        </ul>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-4 text-archive-text300">Cette carte n’est pas suivie dans les calculs de disponibilité.</p>
          )}
        </section>

        <section className="rounded-panel border border-[rgba(199,168,102,0.34)] bg-[rgba(5,8,14,0.72)] p-6 shadow-panel">
          <h2 className="text-2xl font-semibold text-archive-text100">Allocations de decks assemblés</h2>
          {explanation.deckAllocations.length > 0 ? (
            <div className="mt-5 grid gap-3">
              {explanation.deckAllocations.map((allocation) => (
                <div className="rounded-card border border-[rgba(199,168,102,0.22)] bg-[rgba(16,32,51,0.52)] p-4" key={`${allocation.deckName}-${allocation.variant}`}>
                  <p className="text-sm uppercase tracking-[0.22em] text-archive-gold300">{allocation.deckName}</p>
                  <p className="mt-2 text-archive-text100">
                    {allocation.allocatedQuantity} × {cardVariantLabelsFr[allocation.variant]}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-archive-text300">Aucune allocation de deck assemblé ne bloque cette carte.</p>
          )}
        </section>
      </section>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-card border border-[rgba(199,168,102,0.22)] bg-[rgba(16,32,51,0.52)] p-4">
      <dt className="text-xs uppercase tracking-[0.22em] text-archive-gold300">{label}</dt>
      <dd className="mt-2 text-base text-archive-text100">{value}</dd>
    </div>
  );
}
