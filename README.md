# Riftbound Archive

Riftbound Archive is a local-first collection manager and deckbuilding companion for **Riftbound: League of Legends Trading Card Game**.

The application is primarily designed for personal use.

## Goals

- Track owned Riftbound cards and variants.
- Distinguish owned cards from actually available cards.
- Reserve cards automatically for a binder.
- Build theoretical and assembled decks.
- Track missing cards.
- Track booster openings with an accumulating counter.
- Estimate card, deck, booster, and collection values.
- Keep official card data separate from personal user data.

## Current status

Phase 6 Deckbuilding MVP is complete. The app now has local mock official card data, a service-layer flow for recording collection transactions, `CollectionEntry` owned snapshots updated from those transactions, a collection page with filters/search, read-only card detail pages, server-composed binder and availability quantities, an owned-vs-available collection display toggle, a read-only binder page, and a read-only per-card availability explanation page.

Deckbuilding now includes a deck list, deck metadata CRUD, a deck detail page, DeckCard requirement add/edit/remove flows, read-only missing-card and availability display, assembled deck allocation, disassemble flow, a deckbuilder UI foundation, searchable card catalog/add-card UX, and deckbuilder UX polish.

The current next roadmap focus is Phase 7 Booster opening. Binder editing and binder overrides are not implemented yet. Booster behavior, pricing behavior, Riot sync behavior, Electron packaging, and provider work remain future phases.

## Local setup

```bash
npm install
cp .env.example .env
cp .env.example .env.local
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

## Mock official card seed data

Phase 4 includes a small local seed dataset for development:

```bash
DATABASE_URL="file:./dev.db" npm run db:seed
```

The seed data is fictional and test-only. It does not use official Riot card data, official Riot text, official Riot images, Legends of Runeterra assets, or copyrighted card images.

The seed script only inserts or updates official metadata tables: `Set`, `Card`, and `CardTranslation`. It does not seed user collection entries, collection transactions, decks, booster records, price records, or sync logs.

## Validation

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

## Project documentation

- `AGENTS.md`
- `docs/PRODUCT_SPEC.md`
- `docs/ARCHITECTURE.md`
- `docs/DOMAIN_RULES.md`
- `docs/UI_STYLE_GUIDE.md`
- `docs/API_PROVIDERS.md`
- `docs/DATABASE_SCHEMA.md`
- `docs/ROADMAP.md`
- `docs/CODEX_GUIDELINES.md`

## Important note

This project is for **Riftbound**, not Legends of Runeterra. Do not use Legends of Runeterra assets or assumptions.
