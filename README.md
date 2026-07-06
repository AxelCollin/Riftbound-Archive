# Riftbound Archive

Riftbound Archive is a local-first collection manager and deckbuilding companion for **Riftbound: League of Legends Trading Card Game**.

The application is primarily designed for personal use.

## Goals

- Track owned Riftbound printed cards and supported physical finishes.
- Distinguish owned cards from actually available cards.
- Reserve cards automatically for a binder.
- Build theoretical and assembled decks.
- Track missing cards.
- Track booster openings with an accumulating counter.
- Estimate card, deck, booster, and collection values.
- Keep official card data separate from personal user data.

## Current status

Phase 7 Booster opening is complete. The app now has local mock official card data, collection transaction and snapshot flows, collection filters/search, read-only card details, server-composed binder and availability quantities, an owned-vs-available collection toggle, read-only binder and availability pages, deckbuilding MVP flows, and booster opening with accumulated counter, automatic collection transactions, post-opening summaries, and safe rollback.

The current next roadmap focus is Phase 7.5 taxonomy and UX realignment before Phase 8 Pricing MVP. Phase 7.5 corrects the card taxonomy and UX direction so pricing is not built on the old MVP simplification where Showcase behaves like a simple variant beside Normal and Foil. Pricing behavior, provider sync, Electron packaging, binder editing and overrides, imports/exports, and advanced summaries remain future work. External card APIs are planned as explicit card library sync sources only; normal app pages should read the local SQLite library after sync.

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
- `docs/CARD_TAXONOMY.md`
- `docs/UX_TARGET.md`
- `docs/UI_STYLE_GUIDE.md`
- `docs/API_PROVIDERS.md`
- `docs/DATABASE_SCHEMA.md`
- `docs/ROADMAP.md`
- `docs/CODEX_GUIDELINES.md`

## Important note

This project is for **Riftbound**, not Legends of Runeterra. Do not use Legends of Runeterra assets or assumptions.
