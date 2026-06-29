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
- [ ] Add binder page. (Future Phase 5 work; not included in Phase 5B.)
- [ ] Add availability explanation page. (Future Phase 5 work; not included in Phase 5B.)

## Phase 6 - Deckbuilding MVP

- [ ] Add deck CRUD.
- [ ] Add deck card requirements.
- [ ] Add missing-card calculation.
- [ ] Add assembled deck allocation.
- [ ] Add disassemble flow.
- [ ] Add deckbuilder UI.

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
