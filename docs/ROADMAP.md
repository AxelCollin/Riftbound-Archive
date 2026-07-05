# Roadmap

The project must progress through small, reviewable pull requests.

Phases may be split into smaller PRs such as Phase 3A, Phase 3B, and so on when that keeps reviews focused.

## Phase 0 - Governance

- [x] Add project documentation.
- [x] Add `AGENTS.md`.
- [x] Add Codex contribution guidelines.
- [x] Define roadmap and domain rules.

## Phase 1 - Project foundation

- [x] Initialize Next.js App Router project.
- [x] Add TypeScript configuration.
- [x] Add Tailwind.
- [x] Add Prisma and SQLite.
- [x] Add Zod.
- [x] Add Vitest.
- [x] Add CI for lint, typecheck, test, and build.
- [x] Add `.env.example`.

## Phase 2 - Domain model and tests

- [x] Implement card model types.
- [x] Implement variant rules.
- [x] Implement trackable-card logic.
- [x] Implement binder reservation logic.
- [x] Implement availability calculation.
- [x] Add Vitest coverage for all core rules.

## Phase 3 - Database schema

- [x] Add Prisma schema.
- [x] Add official data tables.
- [x] Add user collection tables.
- [x] Add deck tables.
- [x] Add booster tables.
- [x] Add price tables.
- [x] Add sync logs and settings.

## Phase 4 - Collection MVP

- [x] Add manual card seed/mock data support.
- [x] Add collection transaction service/write flow.
- [x] Update collection entry snapshots from transactions.
- [x] Add collection page.
- [x] Add filters and search MVP.
- [x] Add card detail page.

## Phase 5 - Binder and availability UI

- [x] Add binder reservation calculation to queries. (Phase 5A: server-side binder reservation and availability query composition for collection and card detail rows.)
- [x] Add owned versus available toggle. (Phase 5B: collection list can switch its main quantity between precomputed owned and available row fields.)
- [x] Add binder page. (Phase 5C: read-only automatic binder reservation page; no overrides, editing, or write flows.)
- [x] Add availability explanation page. (Phase 5D: read-only per-card explanation of owned, binder-reserved, assembled-deck allocated, raw availability, and app-facing clamped availability; no editing, overrides, deck UI, or write flows.)

## Phase 6 - Deckbuilding MVP

- [x] Add Phase 6A pure deck requirement normalization and missing-card domain logic.
- [x] Add Phase 6B read-only deck list page backed by a server-side query.
- [x] Add deck CRUD. (Phase 6C: minimal deck metadata create, edit, and delete flows only.)
- [x] Add read-only deck detail page. (Phase 6D: server-rendered `/decks/[deckId]` view over persisted DeckCard requirements and DeckCardAllocation rows only.)
- [x] Add deck card requirements persistence and write flows. (Phase 6E: minimal DeckCard requirement add/edit/remove flows from the deck detail page only.)
- [x] Add read-only deck missing-card UI. (Phase 6F: `/decks/[deckId]` compares persisted requirements against current app-facing available collection counts using Phase 6A missing-card domain logic; no allocation writes or assembly/disassembly.)
- [x] Add assembled deck allocation. (Phase 6G: assemble THEORETICAL decks by persisting DeckCardAllocation rows atomically and setting Deck.status to ASSEMBLED.)
- [x] Add disassemble flow. (Phase 6H: delete a deck’s persisted allocations atomically and return it to THEORETICAL.)
- [x] Add deckbuilder UI foundation. (Phase 6I: improve `/decks/[deckId]` layout and split UI sections without changing business rules.)
- [x] Add deckbuilder card catalog/search. (Phase 6J: searchable card catalog/add-card UX using existing DeckCard requirement writes.)
- [x] Add deckbuilder UX polish. (Phase 6K: denser deck list, requirement grouping, clearer availability/missing indicators.)

Phase 6A is domain-only groundwork for later deckbuilding work. It does not add deck CRUD, deck pages, deckbuilder UI, assembly allocation writes, disassembly, schema changes, migrations, booster behavior, pricing behavior, sync behavior, or Electron behavior.

Phase 6B exposes the first deck surface as a read-only `/decks` list page. It reads existing `Deck`, `DeckCard`, and `DeckCardAllocation` rows for table counts and summary totals, but it does not add deck CRUD, deck card requirement writes, assembled allocation writes, disassembly flows, a deck detail page, deckbuilder editing UI, schema changes, migrations, booster behavior, pricing behavior, sync behavior, or Electron behavior.

Phase 6C adds minimal Deck metadata CRUD only: creating empty theoretical decks, editing deck name, description, and allocation strategy, and deleting deck rows. It does not add DeckCard persistence/write flows, DeckCardAllocation writes, card editing UI, missing-card UI, assembly allocation writes, disassembly, deckbuilder UI, schema changes, migrations, booster behavior, pricing behavior, sync behavior, or Electron behavior.

Phase 6D adds a read-only `/decks/[deckId]` detail page backed by a server-side query. It displays deck metadata, already-persisted DeckCard requirements, already-persisted DeckCardAllocation rows, and read-only totals. It does not add deck card requirement write flows, card search/add/remove UI, missing-card UI, assembled allocation writes, disassembly, deckbuilder UI, schema changes, migrations, booster behavior, pricing behavior, sync behavior, or Electron behavior.

Phase 6E adds minimal DeckCard requirement write flows from `/decks/[deckId]`: add a required card line, edit an existing line quantity/preferred variant, and remove a line. It validates trackable cards and supported preferred variants, merges duplicate deck/card/preference requirements, and leaves DeckCardAllocation rows untouched. It does not add assembled allocation writes, disassembly, missing-card UI, automatic allocation persistence, deckbuilder UI, schema changes, migrations, booster behavior, pricing behavior, sync behavior, or Electron behavior.

Phase 6F adds a read-only missing-card and availability section to `/decks/[deckId]`. It composes current DeckCard requirements with app-facing available collection counts and delegates missing-card calculation to the Phase 6A domain logic. It does not create, update, or delete DeckCardAllocation rows; persist automatic allocation planning; assemble or disassemble decks; mutate collection data; change deck status; add pricing, booster, sync, Electron, schema, or migration work.

Phase 6G adds assembled deck allocation for theoretical decks. It atomically persists DeckCardAllocation rows from existing DeckCard requirements, sets the Deck status to ASSEMBLED, and lets availability queries account for those persisted allocations. It does not add disassembly, deckbuilder UI restructuring, card catalog/search UX, pricing, booster, sync, Electron, schema, or migration work.

Phase 6H adds the disassemble flow for assembled decks. It atomically deletes a deck’s persisted DeckCardAllocation rows and returns the Deck status to THEORETICAL so those cards become available again through the existing availability composition. It does not add deckbuilder UI restructuring, card catalog/search UX, pricing, booster, sync, Electron, schema, or migration work.

Phase 6I adds the deckbuilder UI foundation only. It should improve the `/decks/[deckId]` layout and split the page into clearer sections while continuing to consume existing server-side data and business rules unchanged. It must not add new DeckCard writes, allocation behavior, disassembly behavior, pricing, booster, sync, Electron, schema, or migration work.

Phase 6J adds a searchable card catalog and add-card UX to `/decks/[deckId]`. It uses the existing server-side trackable card option query and existing DeckCard requirement write flows from Phase 6E, keeps catalog filtering client-side by card name, set code, collector number, rarity, and kind, disables catalog add controls for assembled decks, and keeps allocation, missing-card, and availability calculations centralized in the established domain and server-side query layers. It does not add new business rules, automatic allocation changes, pricing, booster, sync, Electron, schema, or migration work.

Phase 6K adds deckbuilder UX polish after the foundation and catalog work are in place. It densifies the `/decks/[deckId]` requirement table, groups requirements by set with complete/missing scan labels, and surfaces per-line satisfied and missing quantities from the existing missing-card query data without changing business rules or persistence behavior. With Phase 6K complete, the Phase 6 Deckbuilding MVP is complete. It does not add pricing, booster, sync, Electron, schema, or migration work.

## Phase 7 - Booster opening ✅

- [x] Add booster counter settings. (Phase 7A: minimal `/boosters` settings surface backed by existing `BoosterSettings` persistence for daily increment and default opening decrement behavior.)
- [x] Add accumulated counter calculation. (Phase 7B: read-only accumulated allowance calculation from `BoosterSettings`, displayed on `/boosters`.)
- [x] Add booster opening entry flow. (Phase 7C: minimal `/boosters` opening header form backed by existing `BoosterOpening` persistence and optional `OPENING_DECREMENT` counter events.)
- [x] Add automatic collection transactions. (Phase 7D: pulled-card rows on `/boosters` create `BoosterOpeningCard`, `CollectionTransaction`, and `CollectionEntry` writes atomically for explicitly entered cards.)
- [x] Add post-opening summary. (Phase 7E: `/boosters` can display a read-only French summary for the opening selected by the post-submit `opened` query parameter.)
- [x] Add rollback where safe. (Phase 7F: recorded booster openings can be rolled back only when persisted opening cards, source ADD transactions, and current collection quantities prove a safe reversal.)

Phase 7A adds only the booster counter settings foundation. The `/boosters` page lets the user configure the daily booster increment and whether future openings should decrement the counter by default, using the existing `BoosterSettings` table. It does not add accumulated counter calculation, daily accrual, booster opening entry, collection transactions, post-opening summaries, rollback, pricing, provider sync, or any deckbuilding changes.

Phase 7B adds a read-only accumulated booster counter calculation. The service reads the existing `BoosterSettings` row, sums existing `BoosterCounterEvent.quantityDelta` ledger entries, passes an explicit current time into pure domain logic, counts only complete elapsed day-based intervals since `accrualAnchorAt`, and displays ledger quantity plus virtual accrual on `/boosters`. If an accrual-affecting setting changes, pending virtual accrual from the old settings is materialized as an `ACCRUAL` counter event and the anchor resets to the update time, so edited rates affect future intervals only and do not retroactively alter already-earned boosters. If no settings row exists, the default Phase 7A settings use the request time as a safe anchor so the read-only counter starts at zero. This phase does not create booster openings, opening decrement events, collection transactions, collection entry mutations, post-opening summaries, rollback, pricing, provider sync, or deckbuilding changes.

Phase 7C adds a minimal booster opening entry flow on `/boosters`. The form records the number of boosters opened, whether the counter should be decremented, and an optional note in `BoosterOpening`; on a fresh database, the first opening persists Phase 7A default `BoosterSettings` with the opening time as the accrual anchor. When decrementing with existing settings, pending virtual accrual is materialized first and an `OPENING_DECREMENT` ledger event is written with a negative quantity. The counter can go negative and insufficient counter balance does not block recording. Card-pull detail entry is deferred to a later booster sub-step, so Phase 7C does not create collection transactions, mutate collection entries, add cards automatically, show a post-opening summary, implement rollback, add pricing, provider sync, Electron work, or change deckbuilding behavior.

Phase 7D adds automatic collection transactions for booster openings only. The `/boosters` form now accepts a small fixed set of pulled-card rows; intentionally empty rows are ignored, partially filled rows are rejected, and duplicate card-plus-variant rows are merged deterministically before writing. For each valid GAMEPLAY or ENERGY pull, the service creates a `BoosterOpeningCard`, creates an `ADD` `CollectionTransaction` sourced as `booster-opening:<openingId>`, and increments or creates the matching `CollectionEntry`, all inside the same Prisma transaction as the opening header and optional counter decrement. Header-only openings remain allowed. Phase 7D does not add post-opening summaries, rollback, pricing/value summaries, provider sync, Riot/Riftcodex/RiftScribe clients, Electron work, or deckbuilding changes.

Phase 7E adds a read-only post-opening summary on `/boosters` for the opening selected by the `opened` query parameter after submit. The summary is composed server-side from persisted `BoosterOpening`, `BoosterOpeningCard`, `CollectionTransaction`, `CollectionEntry`, `Card`, `Set`, and `CardTranslation` rows, uses the established French display-name fallback, and shows booster count, counter decrement status, pulled-card rows, quantities, collection entries newly created versus incremented, and total cards added. Invalid or missing opening ids are handled safely without re-running writes. Phase 7E does not add rollback, pricing/value summaries, provider sync, Electron work, or deckbuilding changes.

Phase 7F adds safe rollback for booster openings. A recorded opening can be marked `ROLLED_BACK` only when its original pulled-card rows, source `ADD` collection transactions, and current `CollectionEntry` quantities are present and consistent enough to reverse without making quantities negative. Rollback writes run in one Prisma transaction, decrement the matching collection entries, append positive `REMOVE` compensation transactions sourced as `booster-opening-rollback:<openingId>`, add a `ROLLBACK` counter event only when the opening has an original decrement event, and preserve the original opening, pulled-card rows, original `ADD` transactions, and original counter events as history. The `/boosters` summary exposes the French rollback action only while safe and shows rolled-back status otherwise. With Phase 7F complete, the Phase 7 Booster opening milestone is complete; pricing/value, provider sync, Electron, binder, and deckbuilding changes remain out of scope.

## Phase 7.5 - Post-Phase 7 taxonomy and UX realignment

- [ ] Document corrected card taxonomy and post-Phase 7 UX target.
- [ ] Add gameplay identity and corrected card taxonomy fields.
- [ ] Replace Showcase-as-variant with a finish-aware collection model.
- [ ] Add related printings and gameplay-equivalence helpers.
- [ ] Add a global app shell with persistent navigation.
- [ ] Clean stale deck UI copy and remove user-facing phase labels.
- [ ] Add collection display modes: grid, line, and compact.
- [ ] Add collection faction-icon filters.
- [ ] Add direct collection quantity editing through collection transactions.
- [ ] Redesign card detail around printings, possession, and related cards.
- [ ] Improve booster UX with header access, dynamic opening rows, richer settings, and opening history.
- [ ] Redesign deckbuilder layout around filters, card catalogue, compact deck summary, and inline missing-card visibility.

Phase 7.5 is a deliberate realignment phase before Phase 8 Pricing MVP. It corrects the card taxonomy and UX direction so pricing is not built on the old MVP simplification where `SHOWCASE` behaves like a simple variant beside `NORMAL` and `FOIL`. The target taxonomy separates gameplay card type, gameplay rarity, physical finish, collector category, showcase treatment, faction, and gameplay identity. The UX work uses the provided mockups as visual direction only, while excluding unnecessary dashboard quick actions, rule-explanation blocks, advice blocks, a dedicated Energy page, collection-side deckbuilding, and other surfaces that should move to help/settings or remain future work. Phase 7.5 should be split into small PRs. It must not implement Phase 8 pricing, provider sync, Electron packaging, or unrelated feature work.

## Phase 8 - Pricing MVP

- [ ] Add manual price overrides.
- [ ] Add value calculations.
- [ ] Add price display in collection and decks.
- [ ] Add market page.
- [ ] Add TCGCSV provider if practical.
- [ ] Add JustTCG runtime capability check later.

## Phase 9 - Card library sync / Riot sync

- [ ] Add local card library sync workflow behind feature flag.
- [ ] Add Riot provider behind feature flag as the preferred official provider when available and approved.
- [ ] Add Riftcodex as the recommended interim public provider if Riot access is unavailable.
- [ ] Keep RiftScribe available as an optional fallback or secondary provider.
- [ ] Add locale fallback chain.
- [ ] Store raw JSON payloads in the local card library snapshot.
- [ ] Add sync logs and unresolved mapping reporting.
- [ ] Import normalized provider data into SQLite without overwriting user-owned data.
- [ ] Replace mock data with synced local SQLite card library data when available.

## Phase 10 - Premium 4K UI polish

- [ ] Add final shell layout.
- [ ] Add original UI assets.
- [ ] Add dashboard data density.
- [ ] Add responsive 1080p adaptation.
- [ ] Add visual QA pass.

## Phase 11 - Desktop packaging Electron

- [ ] Add Electron desktop shell.
- [ ] Create a Windows desktop application.
- [ ] Launch the app through an `.exe`.
- [ ] Open the app in a dedicated desktop window.
- [ ] Embed or launch the local Next.js server cleanly.
- [ ] Keep Prisma/SQLite local and server-side.
- [ ] Move the packaged SQLite database location to an appropriate user data directory, for example `AppData/Roaming/Riftbound Archive/`.
- [ ] Configure Windows packaging.
- [ ] Verify SQLite migrations after packaging.
- [ ] Keep API keys and provider secrets server-side/local.
- [ ] Ensure secrets are never exposed to frontend/client code.
- [ ] Prepare a clean base for import/export/backup flows.

## Merge policy

Each phase should be split into small PRs.

A PR should not mix unrelated concerns. For example, do not mix database schema changes with major UI polish unless required.
