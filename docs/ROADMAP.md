# Roadmap

## Document status

This document defines the ordered roadmap. It should stay focused on phase status and next work, not detailed historical implementation notes.

Detailed rules live in:

- `docs/CARD_TAXONOMY.md`
- `docs/DOMAIN_RULES.md`
- `docs/UX_TARGET.md`
- `docs/DATABASE_SCHEMA.md`

## Working rule

The project must progress through small, reviewable pull requests.

Phases may be split into smaller PRs such as Phase 7.5A, Phase 7.5B, and so on when that keeps reviews focused.

## Phase 0 - Governance ✅

- [x] Add project documentation.
- [x] Add `AGENTS.md`.
- [x] Add Codex contribution guidelines.
- [x] Define roadmap and domain rules.

## Phase 1 - Project foundation ✅

- [x] Initialize Next.js App Router project.
- [x] Add TypeScript configuration.
- [x] Add Tailwind.
- [x] Add Prisma and SQLite.
- [x] Add Zod.
- [x] Add Vitest.
- [x] Add CI for lint, typecheck, test, and build.
- [x] Add `.env.example`.

## Phase 2 - Domain model and tests ✅

- [x] Implement card model types.
- [x] Implement variant rules for the MVP model.
- [x] Implement trackable-card logic.
- [x] Implement binder reservation logic.
- [x] Implement availability calculation.
- [x] Add Vitest coverage for all core rules.

Note: Phase 2 used the early MVP `CardVariant` model. Phase 7.5 is responsible for correcting the taxonomy direction before Phase 8 pricing behavior.

## Phase 3 - Database schema ✅

- [x] Add Prisma schema.
- [x] Add official data tables.
- [x] Add user collection tables.
- [x] Add deck tables.
- [x] Add booster tables.
- [x] Add price tables.
- [x] Add sync logs and settings.

## Phase 4 - Collection MVP ✅

- [x] Add manual card seed/mock data support.
- [x] Add collection transaction service/write flow.
- [x] Update collection entry snapshots from transactions.
- [x] Add collection page.
- [x] Add filters and search MVP.
- [x] Add card detail page.

## Phase 5 - Binder and availability UI ✅

- [x] Add binder reservation calculation to queries.
- [x] Add owned versus available toggle.
- [x] Add binder page.
- [x] Add availability explanation page.

## Phase 6 - Deckbuilding MVP ✅

- [x] Add pure deck requirement normalization and missing-card domain logic.
- [x] Add read-only deck list page backed by a server-side query.
- [x] Add minimal deck metadata CRUD.
- [x] Add read-only deck detail page.
- [x] Add deck card requirements persistence and write flows.
- [x] Add read-only deck missing-card UI.
- [x] Add assembled deck allocation.
- [x] Add disassemble flow.
- [x] Add deckbuilder UI foundation.
- [x] Add deckbuilder card catalog/search.
- [x] Add deckbuilder UX polish.

## Phase 7 - Booster opening ✅

- [x] Add booster counter settings.
- [x] Add accumulated counter calculation.
- [x] Add booster opening entry flow.
- [x] Add automatic collection transactions.
- [x] Add post-opening summary.
- [x] Add rollback where safe.

## Phase 7.5 - Post-Phase 7 taxonomy and UX realignment

- [x] Document corrected card taxonomy and post-Phase 7 UX target.
- [x] Normalize documentation structure before Phase 7.5 implementation.
- [x] Add gameplay identity and corrected card taxonomy fields.
- [ ] Replace Showcase-as-variant with a finish-aware collection model.
- [x] Add related printings and gameplay-equivalence helpers.
- [ ] Add a global app shell with persistent navigation.
- [ ] Clean stale deck UI copy and remove user-facing phase labels.
- [ ] Add collection display modes: grid, line, and compact.
- [ ] Add collection faction-icon filters.
- [ ] Add direct collection quantity editing through collection transactions.
- [ ] Redesign card detail around printings, possession, and related cards.
- [ ] Improve booster UX with header access, dynamic opening rows, richer settings, and opening history.
- [ ] Redesign deckbuilder layout around filters, card catalogue, compact deck summary, and inline missing-card visibility.

Phase 7.5 is a deliberate realignment phase before Phase 8 Pricing MVP. It corrects the card taxonomy and UX direction so pricing is not built on the old MVP simplification where `SHOWCASE` behaves like a simple variant beside `NORMAL` and `FOIL`. The target taxonomy separates gameplay card type, gameplay rarity, physical finish, collector category, showcase treatment, faction, and gameplay identity. The UX work uses the provided mockups as visual direction only, while excluding unnecessary dashboard quick actions, rule-explanation blocks, advice blocks, a dedicated Energy page, collection-side deckbuilding, and other surfaces that should move to help/settings or remain future work.

Phase 7.5 should be split into small PRs. It must not implement Phase 8 pricing, provider sync, Electron packaging, or unrelated feature work.

## Phase 8 - Pricing MVP

- [ ] Add manual price overrides.
- [ ] Add value calculations.
- [ ] Add price display in collection and decks.
- [ ] Add market page.
- [ ] Add TCGCSV provider if practical.
- [ ] Add JustTCG runtime capability check later.

Do not begin Phase 8 implementation until the Phase 7.5 taxonomy and collection-display prerequisites are complete or explicitly deferred with a written decision.

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
