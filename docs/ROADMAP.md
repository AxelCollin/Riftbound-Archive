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

Phase 6K adds deckbuilder UX polish after the foundation and catalog work are in place. It densifies the `/decks/[deckId]` requirement table, groups requirements by set with complete/missing scan labels, and surfaces per-line satisfied and missing quantities from the existing missing-card query data without changing business rules or persistence behavior. With Phase 6K complete, the Phase 6 Deckbuilding MVP is complete and the next roadmap focus remains Phase 7 booster opening. It does not add pricing, booster, sync, Electron, schema, or migration work.

## Phase 7 - Booster opening

- [ ] Add booster counter settings.
- [ ] Add accumulated counter calculation.
- [ ] Add booster opening entry flow.
- [ ] Add automatic collection transactions.
- [ ] Add post-opening summary.
- [ ] Add rollback where safe.

## Phase 8 - Pricing MVP

- [ ] Add manual price overrides.
- [ ] Add value calculations.
- [ ] Add price display in collection and decks.
- [ ] Add market page.
- [ ] Add TCGCSV provider if practical.
- [ ] Add JustTCG runtime capability check later.

## Phase 9 - Riot sync

- [ ] Add Riot provider behind feature flag.
- [ ] Add locale fallback chain.
- [ ] Store raw JSON.
- [ ] Add sync logs.
- [ ] Replace mock data with Riot data when available.

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
