import Link from "next/link";
import { notFound } from "next/navigation";
import { getCardDetail } from "@/lib/queries/card-detail";
import { decodeCardIdRouteParam } from "./route-param";

export const dynamic = "force-dynamic";

const variantLabels = {
  NORMAL: "Normale",
  FOIL: "Foil",
  SHOWCASE: "Showcase",
} as const;

const rarityLabels = {
  COMMON: "Commune",
  UNCOMMON: "Peu commune",
  RARE: "Rare",
  EPIC: "Épique",
  ULTIMATE: "Ultime",
  UNKNOWN: "Inconnue",
} as const;

const kindLabels = {
  GAMEPLAY: "Gameplay",
  ENERGY: "Énergie",
  TOKEN: "Jeton",
  RULES: "Règles",
} as const;

const printTreatmentLabels = {
  REGULAR: "Régulier",
  ALT: "Alternatif",
  OVERNUMBER: "Surnuméroté",
  UNKNOWN: "Inconnu",
} as const;

type CardDetailPageProps = {
  params: Promise<{ cardId: string }>;
};

export default async function CardDetailPage({ params }: CardDetailPageProps) {
  const { cardId } = await params;
  const decodedCardId = decodeCardIdRouteParam(cardId);

  if (!decodedCardId) {
    notFound();
  }

  const card = await getCardDetail(decodedCardId);

  if (!card) {
    notFound();
  }

  return (
    <main className="min-h-screen px-8 py-6">
      <section className="mx-auto grid max-w-[var(--content-max)] gap-6">
        <header className="rounded-panel border border-[rgba(199,168,102,0.42)] bg-[rgba(8,17,27,0.88)] p-8 shadow-panel backdrop-blur">
          <Link className="text-sm text-archive-gold300 hover:text-archive-text100" href="/collection">
            ← Retour à la collection
          </Link>
          <p className="mt-6 text-sm uppercase tracking-[0.42em] text-archive-gold300">
            {card.set.code} · {card.collectorNumber}
          </p>
          <h1 className="mt-4 text-5xl font-semibold text-archive-text100">{card.displayName}</h1>
          <p className="mt-4 max-w-4xl text-base leading-7 text-archive-text300">
            Fiche officielle en lecture seule avec les traductions locales et les quantités possédées par variante.
          </p>
        </header>

        <div className="grid gap-6 xl:grid-cols-[minmax(280px,420px)_1fr]">
          <aside className="rounded-panel border border-[rgba(199,168,102,0.34)] bg-[rgba(5,8,14,0.72)] p-5 shadow-panel">
            {card.officialImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt={card.displayName}
                className="h-auto w-full rounded-card border border-[rgba(199,168,102,0.28)] object-cover"
                src={card.officialImageUrl}
              />
            ) : (
              <div className="grid aspect-[5/7] place-items-center rounded-card border border-dashed border-[rgba(199,168,102,0.34)] bg-[rgba(16,32,51,0.52)] p-8 text-center">
                <div>
                  <p className="text-xl font-semibold text-archive-gold300">Image indisponible</p>
                  <p className="mt-3 text-sm text-archive-text300">Aucune URL d’image officielle n’est enregistrée pour cette carte.</p>
                </div>
              </div>
            )}
          </aside>

          <div className="grid gap-6">
            <section className="rounded-panel border border-[rgba(199,168,102,0.34)] bg-[rgba(5,8,14,0.72)] p-6 shadow-panel">
              <h2 className="text-2xl font-semibold text-archive-text100">Résumé</h2>
              <dl className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <Detail label="Set" value={`${card.set.code} — ${card.set.name}`} />
                <Detail label="Numéro" value={card.collectorNumber} />
                <Detail label="Rareté" value={rarityLabels[card.rarity]} />
                <Detail label="Type" value={kindLabels[card.kind]} />
                <Detail label="Traitement" value={printTreatmentLabels[card.printTreatment]} />
                <Detail label="Showcase" value={card.hasShowcase ? "Oui" : "Non"} />
              </dl>
            </section>

            <section className="rounded-panel border border-[rgba(199,168,102,0.34)] bg-[rgba(5,8,14,0.72)] p-6 shadow-panel">
              <h2 className="text-2xl font-semibold text-archive-text100">Possession</h2>
              {card.isTrackable ? (
                <div className="mt-5 overflow-hidden rounded-card border border-[rgba(199,168,102,0.22)]">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-[rgba(16,32,51,0.86)] text-xs uppercase tracking-[0.22em] text-archive-gold300">
                      <tr>
                        <th className="px-5 py-4">Variante</th>
                        <th className="px-5 py-4 text-right">Possédées</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[rgba(199,168,102,0.14)]">
                      {card.ownershipRows.map((row) => (
                        <tr className="text-archive-text300" key={row.variant}>
                          <td className="px-5 py-4 text-archive-gold300">{variantLabels[row.variant]}</td>
                          <td className="px-5 py-4 text-right text-lg font-semibold text-archive-text100">{row.ownedQuantity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="mt-4 rounded-card border border-[rgba(199,168,102,0.22)] bg-[rgba(16,32,51,0.52)] p-4 text-archive-text300">
                  Cette carte est affichée en lecture seule, mais les jetons et cartes de règles ne sont pas suivis dans les quantités de collection.
                </p>
              )}
            </section>

            <section className="rounded-panel border border-[rgba(199,168,102,0.34)] bg-[rgba(5,8,14,0.72)] p-6 shadow-panel">
              <h2 className="text-2xl font-semibold text-archive-text100">Traductions</h2>
              {card.translations.length > 0 ? (
                <div className="mt-5 grid gap-4">
                  {card.translations.map((translation) => (
                    <article className="rounded-card border border-[rgba(199,168,102,0.22)] bg-[rgba(16,32,51,0.52)] p-4" key={translation.locale}>
                      <p className="text-sm uppercase tracking-[0.22em] text-archive-gold300">{translation.locale}</p>
                      <h3 className="mt-2 text-xl font-semibold text-archive-text100">{translation.name}</h3>
                      {translation.subtitle ? <p className="mt-1 text-sm text-archive-text300">{translation.subtitle}</p> : null}
                      {translation.rulesText ? <p className="mt-3 whitespace-pre-line text-sm leading-6 text-archive-text300">{translation.rulesText}</p> : null}
                      {translation.flavorText ? <p className="mt-3 text-sm italic leading-6 text-archive-text500">{translation.flavorText}</p> : null}
                    </article>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-archive-text300">Aucune traduction locale enregistrée.</p>
              )}
            </section>

            <section className="rounded-panel border border-[rgba(199,168,102,0.34)] bg-[rgba(5,8,14,0.72)] p-6 shadow-panel">
              <h2 className="text-2xl font-semibold text-archive-text100">Métadonnées officielles</h2>
              <dl className="mt-5 grid gap-4 md:grid-cols-2">
                <Detail label="Nom officiel" value={card.officialName} />
                <Detail label="Rareté brute" value={card.officialRarityRaw ?? "—"} />
                <Detail label="Traitement brut" value={card.printTreatmentRaw ?? "—"} />
                <Detail label="Artiste" value={card.officialArtist ?? "—"} />
                <Detail label="Favori local" value={card.userMeta?.favorite ? "Oui" : "Non"} />
                <Detail label="Note locale" value={card.userMeta?.note ?? "—"} />
              </dl>
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-card border border-[rgba(199,168,102,0.22)] bg-[rgba(16,32,51,0.52)] p-4">
      <dt className="text-xs uppercase tracking-[0.22em] text-archive-gold300">{label}</dt>
      <dd className="mt-2 text-base text-archive-text100">{value}</dd>
    </div>
  );
}
