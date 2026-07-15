import Link from "next/link";
import { notFound } from "next/navigation";
import {
  cardCollectorCategoryLabelsFr,
  cardFactionLabelsFr,
  cardGameplayRarityLabelsFr,
  cardGameplayTypeLabelsFr,
  cardPrintTreatmentLabelsFr,
  physicalFinishLabelsFr,
  showcaseTreatmentLabelsFr,
} from "@/lib/formatters/cards";
import { updateCardDetailQuantityAction, updateCardFavoriteAction, updateCardNoteAction } from "./actions";
import { CARD_NOTE_MAX_LENGTH } from "@/lib/services/card-user-meta";
import { getCardDetailFromRouteParam, type CardPossessionFinish } from "@/lib/queries/card-detail";

export const dynamic = "force-dynamic";

type CardDetailPageProps = { params: Promise<{ cardId: string }>; searchParams?: Promise<Record<string, string | string[] | undefined>> };

export default async function CardDetailPage({ params, searchParams }: CardDetailPageProps) {
  const { cardId } = await params;
  const card = await getCardDetailFromRouteParam(cardId);
  const feedback = getFeedback(await searchParams);

  if (!card) notFound();

  const printing = card.printing;
  const badges = [
    printing.gameplayType ? cardGameplayTypeLabelsFr[printing.gameplayType] : null,
    printing.gameplayRarity ? cardGameplayRarityLabelsFr[printing.gameplayRarity] : null,
    printing.collectorCategory ? cardCollectorCategoryLabelsFr[printing.collectorCategory] : null,
    printing.showcaseTreatment ? showcaseTreatmentLabelsFr[printing.showcaseTreatment] : null,
    ...printing.factions.map((faction) => cardFactionLabelsFr[faction]),
  ].filter(Boolean);

  return (
    <main className="min-h-screen px-4 py-6 md:px-8">
      <section className="mx-auto grid max-w-[var(--content-max)] gap-6">
        <header className="rounded-panel border border-[rgba(199,168,102,0.42)] bg-[rgba(8,17,27,0.88)] p-6 shadow-panel backdrop-blur md:p-8">
          <Link className="text-sm text-archive-gold300 hover:text-archive-text100" href="/collection">← Retour à la collection</Link>
          <p className="mt-6 text-sm uppercase tracking-[0.42em] text-archive-gold300">{printing.set.code} · {printing.collectorNumber}</p>
          <h1 className="mt-4 text-4xl font-semibold text-archive-text100 md:text-5xl">{printing.displayName}</h1>
          <div className="mt-5 flex flex-wrap gap-2">
            {badges.map((badge) => <Badge key={badge}>{badge}</Badge>)}
          </div>
                  <FavoriteForm cardId={printing.id} cardName={printing.displayName} favorite={card.userMeta?.favorite ?? false} />
          <FeedbackBanners feedback={feedback} />
        </header>

        <div className="grid gap-6 xl:grid-cols-[minmax(280px,420px)_1fr]">
          <aside className="rounded-panel border border-[rgba(199,168,102,0.34)] bg-[rgba(5,8,14,0.72)] p-5 shadow-panel">
            {printing.officialImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img alt={printing.displayName} className="h-auto w-full rounded-card border border-[rgba(199,168,102,0.28)] object-cover" src={printing.officialImageUrl} />
            ) : (
              <div className="grid aspect-[5/7] place-items-center rounded-card border border-dashed border-[rgba(199,168,102,0.34)] bg-[rgba(16,32,51,0.52)] p-8 text-center">
                <div><p className="text-xl font-semibold text-archive-gold300">Image indisponible</p><p className="mt-3 text-sm text-archive-text300">Aucune URL d’image officielle n’est enregistrée pour cette impression.</p></div>
              </div>
            )}
          </aside>

          <div className="grid gap-6">
            <section className="rounded-panel border border-[rgba(199,168,102,0.34)] bg-[rgba(5,8,14,0.72)] p-6 shadow-panel">
              <h2 className="text-2xl font-semibold text-archive-text100">Impression consultée</h2>
              <dl className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <Detail label="Set" value={`${printing.set.code} — ${printing.set.name}`} />
                <Detail label="Numéro" value={printing.collectorNumber} />
                <Detail label="Catégorie" value={printing.collectorCategory ? cardCollectorCategoryLabelsFr[printing.collectorCategory] : "—"} />
                <Detail label="Traitement Showcase" value={printing.showcaseTreatment ? showcaseTreatmentLabelsFr[printing.showcaseTreatment] : "—"} />
                <Detail label="Traitement d’impression" value={cardPrintTreatmentLabelsFr[printing.printTreatment]} />
                <Detail label="Identité de gameplay" value={printing.gameplayIdentityKey?.trim() || "—"} />
              </dl>
            </section>

            <section className="rounded-panel border border-[rgba(199,168,102,0.34)] bg-[rgba(5,8,14,0.72)] p-6 shadow-panel">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><h2 className="text-2xl font-semibold text-archive-text100">Possession de cette impression</h2><p className="mt-2 text-sm text-archive-text300">Normal et Foil sont les seules finitions physiques suivies ici.</p></div>
                <Link className="text-sm font-semibold text-archive-gold300 hover:text-archive-text100" href={`/cards/${encodeURIComponent(printing.id)}/availability`}>Voir l’explication de disponibilité →</Link>
              </div>
              {card.possession.isTrackable ? (
                <div className="mt-5 grid gap-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    <Metric label="Possédées au total" value={card.possession.totalOwnedQuantity} />
                    <Metric label="Réservées binder" value={card.possession.totalBinderReservedQuantity} />
                    <Metric label="Disponibles" value={card.possession.totalAvailableQuantity} />
                    <div className="rounded-card border border-[rgba(199,168,102,0.22)] bg-[rgba(16,32,51,0.52)] p-4"><p className="text-xs uppercase tracking-[0.22em] text-archive-gold300">Statut binder</p><p className="mt-2 text-base font-semibold text-archive-text100">{card.possession.reservationStatus}</p></div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <FinishBlock title={physicalFinishLabelsFr.NORMAL} finish="NORMAL" row={card.possession.normal} cardId={printing.id} cardName={printing.displayName} />
                    <FinishBlock title={physicalFinishLabelsFr.FOIL} finish="FOIL" row={card.possession.foil} cardId={printing.id} cardName={printing.displayName} />
                  </div>
                  {card.possession.legacyShowcaseCompatibility ? <LegacyShowcase row={card.possession.legacyShowcaseCompatibility} /> : null}
                </div>
              ) : <p className="mt-4 rounded-card border border-[rgba(199,168,102,0.22)] bg-[rgba(16,32,51,0.52)] p-4 text-archive-text300">Cette carte est affichée en lecture seule, mais les jetons et cartes de règles ne sont pas suivis dans les quantités de collection.</p>}
            </section>
          </div>
        </div>

        <section className="rounded-panel border border-[rgba(199,168,102,0.34)] bg-[rgba(5,8,14,0.72)] p-6 shadow-panel">
          <h2 className="text-2xl font-semibold text-archive-text100">Impressions liées</h2>
          {card.relatedPrintings.length > 0 ? <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{card.relatedPrintings.map((related) => <Link className="group grid grid-cols-[84px_1fr] gap-4 rounded-card border border-[rgba(199,168,102,0.22)] bg-[rgba(16,32,51,0.52)] p-3 hover:border-archive-gold300" href={related.href} key={related.id}>{related.officialImageUrl ? // eslint-disable-next-line @next/next/no-img-element
            <img alt={related.displayName} className="aspect-[5/7] w-full rounded-md object-cover" src={related.officialImageUrl} /> : <div className="grid aspect-[5/7] place-items-center rounded-md border border-dashed border-[rgba(199,168,102,0.28)] text-center text-xs text-archive-text500">Sans image</div>}<div><h3 className="font-semibold text-archive-text100 group-hover:text-archive-gold300">{related.displayName}</h3><p className="mt-1 text-sm text-archive-text300">{related.set.code} · {related.collectorNumber}</p><p className="mt-2 text-xs uppercase tracking-[0.18em] text-archive-gold300">{related.collectorCategory ? cardCollectorCategoryLabelsFr[related.collectorCategory] : "—"}{related.showcaseTreatment ? ` · ${showcaseTreatmentLabelsFr[related.showcaseTreatment]}` : ""}</p><p className="mt-3 text-sm text-archive-text300">Possédées : <span className="font-semibold text-archive-text100">{related.ownedQuantity}</span></p></div></Link>)}</div> : <p className="mt-4 rounded-card border border-[rgba(199,168,102,0.22)] bg-[rgba(16,32,51,0.52)] p-4 text-archive-text300">Aucune autre impression liée par identité de gameplay.</p>}
        </section>

        <section className="rounded-panel border border-[rgba(199,168,102,0.34)] bg-[rgba(5,8,14,0.72)] p-6 shadow-panel">
          <h2 className="text-2xl font-semibold text-archive-text100">Texte de la carte</h2>
          {card.translations.length > 0 ? <div className="mt-5 grid gap-4">{card.translations.map((translation) => <article className="rounded-card border border-[rgba(199,168,102,0.22)] bg-[rgba(16,32,51,0.52)] p-4" key={translation.locale}><p className="text-sm uppercase tracking-[0.22em] text-archive-gold300">{translation.locale}</p><h3 className="mt-2 text-xl font-semibold text-archive-text100">{translation.name}</h3>{translation.subtitle ? <p className="mt-1 text-sm text-archive-text300">{translation.subtitle}</p> : null}{translation.rulesText ? <p className="mt-3 whitespace-pre-line text-sm leading-6 text-archive-text300">{translation.rulesText}</p> : null}{translation.flavorText ? <p className="mt-3 text-sm italic leading-6 text-archive-text500">{translation.flavorText}</p> : null}</article>)}</div> : <p className="mt-4 text-archive-text300">Aucune traduction locale enregistrée.</p>}
        </section>

        <section className="rounded-panel border border-[rgba(199,168,102,0.34)] bg-[rgba(5,8,14,0.72)] p-6 shadow-panel">
          <h2 className="text-2xl font-semibold text-archive-text100">Informations secondaires</h2>
          <dl className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Detail label="Nom officiel" value={printing.officialName !== printing.displayName ? printing.officialName : "Identique au nom affiché"} />
            <Detail label="Artiste officiel" value={printing.officialArtist ?? "—"} />
            <Detail label="Rareté brute" value={card.officialRarityRaw ?? "—"} />
            <Detail label="Traitement brut" value={card.printTreatmentRaw ?? "—"} />
            <Detail label="Favori local" value={card.userMeta?.favorite ? "Oui" : "Non"} />
          </dl>
          <NoteForm cardId={printing.id} note={card.userMeta?.note ?? ""} />
        </section>
      </section>
    </main>
  );
}

function Badge({ children }: { children: React.ReactNode }) { return <span className="rounded-full border border-[rgba(199,168,102,0.28)] bg-[rgba(199,168,102,0.10)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-archive-gold300">{children}</span>; }
function Detail({ label, value }: { label: string; value: string }) { return <div className="rounded-card border border-[rgba(199,168,102,0.22)] bg-[rgba(16,32,51,0.52)] p-4"><dt className="text-xs uppercase tracking-[0.22em] text-archive-gold300">{label}</dt><dd className="mt-2 text-base text-archive-text100">{value}</dd></div>; }
function Metric({ label, value }: { label: string; value: number }) { return <div className="rounded-card border border-[rgba(199,168,102,0.22)] bg-[rgba(16,32,51,0.52)] p-4"><p className="text-xs uppercase tracking-[0.22em] text-archive-gold300">{label}</p><p className="mt-2 text-3xl font-semibold text-archive-text100">{value}</p></div>; }
function FinishBlock({ title, finish, row, cardId, cardName }: { title: string; finish: "NORMAL" | "FOIL"; row: CardPossessionFinish; cardId: string; cardName: string }) { return <article className="rounded-card border border-[rgba(199,168,102,0.22)] bg-[rgba(16,32,51,0.52)] p-4"><h3 className="text-lg font-semibold text-archive-text100">{title}</h3><dl className="mt-4 grid grid-cols-3 gap-3 text-sm"><Mini label="Possédées" value={row.ownedQuantity} /><Mini label="Réservées binder" value={row.binderReservedQuantity} /><Mini label="Disponibles" value={row.availableQuantity} /></dl><p className="mt-4 text-sm text-archive-text300">Copies sans langue définie modifiables : <span className="font-semibold text-archive-text100">{row.editableUnknownQuantity}</span></p>{row.canIncrement ? <div className="mt-4 flex gap-2"><QuantityButton cardId={cardId} finish={finish} operation="REMOVE" disabled={!row.canDecrement} label={`Retirer une copie ${title} de ${cardName}`}>-1</QuantityButton><QuantityButton cardId={cardId} finish={finish} operation="ADD" disabled={false} label={`Ajouter une copie ${title} de ${cardName}`}>+1</QuantityButton></div> : <p className="mt-4 text-sm text-archive-text500">Non disponible pour cette impression</p>}</article>; }
function Mini({ label, value }: { label: string; value: number }) { return <div><dt className="text-archive-text500">{label}</dt><dd className="mt-1 text-xl font-semibold text-archive-text100">{value}</dd></div>; }
function QuantityButton({ cardId, finish, operation, disabled, label, children }: { cardId: string; finish: "NORMAL" | "FOIL"; operation: "ADD" | "REMOVE"; disabled: boolean; label: string; children: React.ReactNode }) { return <form action={updateCardDetailQuantityAction}><input type="hidden" name="cardId" value={cardId} /><input type="hidden" name="physicalFinish" value={finish} /><input type="hidden" name="operation" value={operation} /><button aria-label={label} disabled={disabled} className="rounded-full border border-[rgba(199,168,102,0.34)] px-4 py-2 text-sm font-semibold text-archive-gold300 disabled:cursor-not-allowed disabled:opacity-40" type="submit">{children}</button></form>; }
function FavoriteForm({ cardId, cardName, favorite }: { cardId: string; cardName: string; favorite: boolean }) { return <form action={updateCardFavoriteAction} className="mt-5"><input type="hidden" name="cardId" value={cardId} /><input type="hidden" name="favorite" value={favorite ? "false" : "true"} /><button aria-label={`${favorite ? "Retirer des favoris" : "Ajouter aux favoris"} ${cardName}`} className="rounded-full border border-[rgba(199,168,102,0.38)] bg-[rgba(199,168,102,0.10)] px-4 py-2 text-sm font-semibold text-archive-gold300" type="submit">{favorite ? "Retirer des favoris" : "Ajouter aux favoris"}</button></form>; }
function NoteForm({ cardId, note }: { cardId: string; note: string }) { return <form action={updateCardNoteAction} className="mt-5 rounded-card border border-[rgba(199,168,102,0.22)] bg-[rgba(16,32,51,0.52)] p-4"><input type="hidden" name="cardId" value={cardId} /><label className="text-xs uppercase tracking-[0.22em] text-archive-gold300" htmlFor="card-note">Note locale</label><textarea id="card-note" name="note" maxLength={CARD_NOTE_MAX_LENGTH} defaultValue={note} className="mt-3 min-h-32 w-full rounded-card border border-[rgba(199,168,102,0.28)] bg-[rgba(5,8,14,0.82)] p-3 text-archive-text100" /><p className="mt-2 text-xs text-archive-text500">Maximum {CARD_NOTE_MAX_LENGTH} caractères. Envoyez une note vide pour l’effacer.</p><button className="mt-3 rounded-full border border-[rgba(199,168,102,0.38)] px-4 py-2 text-sm font-semibold text-archive-gold300" type="submit">Enregistrer la note</button></form>; }
function getFeedback(params?: Record<string, string | string[] | undefined>) { const first = (key: string) => { const value = params?.[key]; return Array.isArray(value) ? value[0] : value; }; return { successes: [first("quantityUpdated") ? "Quantité mise à jour." : null, first("favoriteUpdated") ? "Favori mis à jour." : null, first("noteUpdated") ? "Note locale mise à jour." : null].filter(Boolean) as string[], errors: [first("quantityError"), first("favoriteError"), first("noteError")].filter(Boolean) as string[] }; }
function FeedbackBanners({ feedback }: { feedback: { successes: string[]; errors: string[] } }) { return <div className="mt-4 grid gap-2">{feedback.successes.map((message) => <p key={message} role="status" className="rounded-card border border-emerald-400/40 bg-emerald-950/40 p-3 text-sm text-emerald-100">{message}</p>)}{feedback.errors.map((message) => <p key={message} role="alert" className="rounded-card border border-red-400/40 bg-red-950/40 p-3 text-sm text-red-100">{message}</p>)}</div>; }
function LegacyShowcase({ row }: { row: CardPossessionFinish }) { return <aside className="rounded-card border border-dashed border-[rgba(199,168,102,0.36)] bg-[rgba(199,168,102,0.08)] p-4 text-sm text-archive-text300"><p className="font-semibold text-archive-gold300">Données de compatibilité Showcase héritées — lecture seule</p><p className="mt-2">Ces quantités restent visibles pour compatibilité, mais Showcase n’est pas une finition physique Normal/Foil.</p><dl className="mt-3 grid gap-3 md:grid-cols-3"><Mini label="Possédées" value={row.ownedQuantity} /><Mini label="Réservées binder" value={row.binderReservedQuantity} /><Mini label="Disponibles" value={row.availableQuantity} /></dl></aside>; }
