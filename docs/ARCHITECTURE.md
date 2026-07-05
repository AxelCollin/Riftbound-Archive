# Architecture

## Document status

This document defines the technical architecture boundaries for Riftbound Archive.

It separates current implementation rules from planned architecture. Planned routes or folders are not automatically implemented behavior.

## Current decision

The current implementation is a local Next.js web application, not a packaged desktop application.

Default stack:

- Next.js App Router
- TypeScript
- React
- Prisma
- SQLite
- Tailwind CSS
- Zod
- Vitest

The intended final desktop packaging target is Electron for Windows, but Electron must be added only during the dedicated Electron phase. Current PRs must stay compatible with future Electron packaging without adding Electron-specific code early.

## Architecture principles

- Local-first data storage.
- Server-side external API access for explicit sync/update workflows only.
- No API keys in client-side code.
- Official card data separated from user-owned data.
- Domain calculations centralized in pure TypeScript modules.
- UI components consume computed results and must not reimplement business logic.
- External providers must be replaceable.
- External card APIs feed a local card library snapshot, not normal runtime pages.
- The app must run in degraded mode without Riot or price API credentials.
- The card taxonomy target in `docs/CARD_TAXONOMY.md` must guide Phase 7.5 architecture work.

## Current implementation shape

The current app primarily uses:

- server-rendered app routes under `src/app`;
- server actions for local writes;
- service modules for persistence workflows;
- query modules for server-side composed page data;
- pure domain modules for rule-heavy calculations;
- Prisma/SQLite server-side only.

React client components may handle presentation and interaction state, but they must not access Prisma, SQLite, provider APIs, or duplicate domain formulas.

## Future Electron compatibility

Until the dedicated Electron packaging phase, the app should continue to be developed and validated as the existing local Next.js web app.

To preserve a clean path toward a future Windows desktop package:

- Do not access Prisma or SQLite directly from React client components.
- Keep database access in server-side modules, services, route handlers, or equivalent server-only code.
- Keep domain and business logic outside UI components.
- Use relative URLs in app code when possible.
- Do not hardcode `http://localhost:3000` as an application assumption.
- Keep `DATABASE_URL` configurable.
- Avoid dependencies on a specific browser runtime.
- Keep API keys and provider secrets server-side/local.
- Do not expose secrets to frontend/client code.
- Do not add Electron-specific code until the dedicated Electron phase.

## Suggested project structure

This structure is a target direction. Not every folder or route exists yet.

```text
src/
  app/
    collection/
    cards/[cardId]/
    decks/
    decks/[deckId]/
    availability/
    binder/
    boosters/
    market/          # future Phase 8+
    settings/        # future/post-7.5 expansion
    api/             # only when route handlers are needed
  components/
    shell/           # Phase 7.5 target
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
      card-taxonomy.ts  # Phase 7.5 target, name illustrative
      binder.ts
      availability.ts
      decks.ts
      boosters.ts
      prices.ts
    providers/
      cards/
      prices/
    queries/
    services/
    formatters/
  styles/
    globals.css
    theme.css
prisma/
  schema.prisma
data/
  card-library/      # future generated local sync output
public/
  ui/                # original UI assets only
```

## Data separation

Card provider APIs are not runtime data sources for normal pages. They are explicit sync/update sources that create a local card library snapshot.

Intended sync flow:

1. raw provider files are preserved locally;
2. official metadata is normalized;
3. normalized official metadata is imported into SQLite;
4. app pages read SQLite through server-side queries and domain modules.

The runtime UI should continue to work offline after sync.

Official synchronized data may include:

- sets;
- cards;
- card translations;
- future card assets;
- sync logs;
- raw provider payloads preserved in local files.

User-owned data includes:

- collection entries and transactions;
- card user metadata;
- binder overrides;
- decks, requirements, and allocations;
- booster settings, events, openings, and pulled cards;
- manual price overrides;
- app settings.

Price data includes:

- price providers;
- price mappings;
- card prices;
- provider raw payloads.

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

Secrets must stay in local environment variables or another server-side/local secret store. They must never be exposed to frontend/client code.

## Route guidance

Do not assume every planned route exists.

### Current route style

The current app may use server actions and server-side services instead of API routes for local-first workflows. That is valid.

### Planned or candidate API routes

API routes may be added later when they are useful for sync workflows, import/export, desktop integration, or explicit client/server boundaries.

Candidate future routes include:

- `POST /api/sync/card-library`
- `POST /api/sync/riot`
- `POST /api/sync/prices`
- `GET /api/cards`
- `GET /api/cards/[cardId]`
- `POST /api/collection`
- `POST /api/collection/import`
- `GET /api/collection/export`
- `GET /api/decks`
- `POST /api/decks`
- `PATCH /api/decks/[deckId]`
- `DELETE /api/decks/[deckId]`
- `POST /api/decks/[deckId]/assemble`
- `POST /api/decks/[deckId]/disassemble`
- `POST /api/boosters/open`
- `POST /api/boosters/[openingId]/rollback`
- `GET|POST|PATCH /api/prices/mappings`
- `GET|PATCH /api/settings`

These routes are not implementation requirements until a roadmap item explicitly asks for them.

## CI expectations

The repository should run:

```text
npm run lint
npm run typecheck
npm run test
npm run build
```

Functional PRs must pass relevant checks before merge.
