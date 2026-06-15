# Architecture

## Decision

The MVP is a local web application, not a packaged desktop application.

Default stack:

- Next.js App Router
- TypeScript
- React
- Prisma
- SQLite
- Tailwind CSS
- Zod
- Vitest

A Tauri or Electron wrapper may be added later, but it must not be required for the first working version.

## Architecture principles

- Local-first data storage.
- Server-side external API access.
- No API keys in client-side code.
- Official card data separated from user data.
- Domain calculations centralized in pure TypeScript modules.
- UI components must consume computed results, not reimplement business logic.
- External providers must be replaceable.
- The app must run in degraded mode without Riot or price API credentials.

## Suggested project structure

```text
src/
  app/
    dashboard/
    collection/
    cards/[cardId]/
    decks/
    decks/[deckId]/
    availability/
    binder/
    boosters/
    market/
    settings/
    api/
      sync/riot/
      sync/prices/
      cards/
      collection/
      decks/
      boosters/
      prices/
      settings/
  components/
    shell/
    dashboard/
    collection/
    decks/
    boosters/
    market/
    ui/
  lib/
    db.ts
    domain/
      cards.ts
      binder.ts
      availability.ts
      decks.ts
      boosters.ts
      prices.ts
    providers/
      riot/
      prices/
        justtcg.ts
        tcgcsv.ts
        cardmarket.ts
        manual.ts
    queries/
    formatters/
  styles/
    globals.css
    theme.css
  tests/
    cards.test.ts
    binder.test.ts
    availability.test.ts
    decks.test.ts
    boosters.test.ts
    prices.test.ts
prisma/
  schema.prisma
public/
  ui/
    backgrounds/
    panels/
    dividers/
    badges/
    icons/
    placeholders/
```

## Data separation

Official synchronized data:

- `sets`
- `cards`
- `cardTranslations`
- `cardAssets` (future/optional dedicated asset table)
- `syncLogs`
- raw provider payloads

The current Phase 3 MVP Prisma schema does not include a dedicated `CardAsset`/`cardAssets` table. It stores the official image URL and artist metadata directly on `Card` through fields such as `officialImageUrl` and `officialArtist`. A separate asset table can be added later only if multiple images, richer asset metadata, or provider-specific asset history justify it.

User-owned data:

- `collectionEntries`
- `collectionTransactions`
- `cardUserMeta`
- `binderOverrides`
- `decks`
- `deckCards`
- `deckCardAllocations`
- `boosterSettings`
- `boosterCounterEvents`
- `boosterOpenings`
- `boosterOpeningCards`
- `manualPriceOverrides`
- `appSettings`

Price data:

- `priceProviders`
- `priceMappings`
- `cardPrices`
- provider raw payloads

## Environment variables

Minimum expected variables:

```text
DATABASE_URL="file:./dev.db"
APP_TIMEZONE="Europe/Paris"
APP_DEFAULT_LOCALE="fr"
RIOT_API_KEY=""
RIOT_API_BASE_URL=""
RIOT_LOCALE_CHAIN="fr-FR,fr-fr,fr,en-US,en"
JUSTTCG_API_KEY=""
PRICE_PROVIDER_ORDER="manual,tcgcsv,justtcg,cardmarket"
CARDMARKET_APP_TOKEN=""
CARDMARKET_APP_SECRET=""
CARDMARKET_ACCESS_TOKEN=""
CARDMARKET_ACCESS_TOKEN_SECRET=""
TCGCSV_CATEGORY_ID_RIFTBOUND="89"
ENABLE_RIOT_SYNC="false"
ENABLE_PRICE_SYNC="false"
```

## Internal API routes

- `POST /api/sync/riot`: synchronize official Riot card data.
- `POST /api/sync/prices`: synchronize prices from enabled providers.
- `GET /api/cards`: card search, filters, and sorting.
- `GET /api/cards/[cardId]`: enriched card detail.
- `POST /api/collection`: create a collection transaction.
- `POST /api/collection/import`: import collection data.
- `GET /api/collection/export`: export collection data.
- `GET /api/decks`: list decks.
- `POST /api/decks`: create deck.
- `PATCH /api/decks/[deckId]`: update deck.
- `DELETE /api/decks/[deckId]`: archive or delete deck.
- `POST /api/decks/[deckId]/assemble`: allocate cards and mark deck assembled.
- `POST /api/decks/[deckId]/disassemble`: free allocations.
- `POST /api/boosters/open`: create booster opening.
- `POST /api/boosters/[openingId]/rollback`: rollback booster opening.
- `GET|POST|PATCH /api/prices/mappings`: manage price mappings.
- `GET|PATCH /api/settings`: manage app settings.

## CI expectations

The repository must eventually run:

```text
npm run lint
npm run typecheck
npm run test
npm run build
```

Do not merge functional PRs until CI exists and passes.
