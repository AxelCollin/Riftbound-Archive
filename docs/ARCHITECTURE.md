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

The current implementation remains a local Next.js web app. The intended final desktop packaging target is Electron for Windows, but Electron should be added only after the current roadmap is substantially complete. Current PRs must remain compatible with future Electron packaging without implementing Electron-specific code early.

## Architecture principles

- Local-first data storage.
- Server-side external API access for explicit sync/update workflows only.
- No API keys in client-side code.
- Official card data separated from user data.
- Domain calculations centralized in pure TypeScript modules.
- UI components must consume computed results, not reimplement business logic.
- External providers must be replaceable.
- External card APIs must feed a local card library snapshot, not normal runtime pages.
- The app must run in degraded mode without Riot or price API credentials.

## Future Electron compatibility

Until the dedicated Electron packaging phase, the app should continue to be developed and validated as the existing local Next.js web app. To preserve a clean path toward a future Windows desktop package:

- Do not access Prisma or SQLite directly from React client components.
- Keep database access in server-side modules, services, route handlers, or equivalent server-only code.
- Keep domain and business logic outside UI components.
- Use relative URLs in app code when possible.
- Do not hardcode `http://localhost:3000` as an application assumption.
- Keep `DATABASE_URL` configurable.
- Avoid dependencies on a specific browser runtime.
- Keep API keys and provider secrets server-side/local.
- Do not expose secrets to frontend/client code.
- Do not add Electron-specific code to current feature PRs until the dedicated Electron phase.

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
      sync/card-library/
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
      cards/
        riot/
        riftcodex/
        riftscribe/
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
data/
  card-library/
    manifest.json
    providers/
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

Card provider APIs are not runtime data sources for normal pages. They are explicit sync/update sources that create a local card library snapshot: raw provider files are preserved locally, normalized official metadata is imported into SQLite, and app pages then read SQLite through server-side queries and domain modules. The runtime UI should continue to work offline after sync.

Official synchronized data:

- `sets`
- `cards`
- `cardTranslations`
- `cardAssets` (future/optional dedicated asset table)
- `syncLogs`
- raw provider payloads preserved in local card library files

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

- `POST /api/sync/card-library`: explicitly refresh the local card library from the configured card content provider.
- `POST /api/sync/riot`: future Riot-specific card library sync entry point, if kept separate from the generic card library route.
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
