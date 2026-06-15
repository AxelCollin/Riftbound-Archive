# Database schema

## Phase 3A scope

This schema foundation adds only the first official Riftbound card data tables:

- `Set` stores official set metadata.
- `Card` stores official card metadata, including normalized rarity, raw provider rarity, kind, print treatment, collector number, optional official image and artist fields, and the raw official provider payload when available.
- `CardTranslation` stores localized official card text by locale.

This PR intentionally does not add user collection, deck, booster, price, sync log, provider, or workflow tables. Those persistence concerns are planned for later Phase 3 pull requests so each schema change remains small and reviewable.

## Phase 3B scope

This schema increment adds only the first user collection persistence tables:

- `CollectionEntry` stores the current owned quantity snapshot for one official card and one physical `CardVariant`.
- `CollectionTransaction` stores append-only collection history entries so owned quantities can be audited and rebuilt later.
- `CardUserMeta` stores user-specific card metadata such as favorites and personal notes.
- `BinderOverride` stores optional user overrides for binder reservation behavior.

Binder reservation and availability remain computed by domain logic rather than stored as database facts. Availability still uses the canonical formula:

```text
available = owned - binderReserved - assembledDeckAllocated
```

Deck, booster, price, provider, and sync workflow tables are still future Phase 3 pull requests.

## Phase 3C scope

This schema increment adds only the deck persistence foundation:

- `Deck` stores user-created deck metadata, including the deck name, optional description, current status, and allocation strategy.
- `DeckCard` stores theoretical deck requirements: which official cards a deck wants, in what quantity, and which explicit variant preference applies.
- `DeckCardAllocation` stores real allocated physical cards for assembled decks by card, variant, and quantity.

`DeckCard.preferredVariant` uses the deck-specific `DeckCardVariantPreference` enum instead of nullable `CardVariant`. `ANY` means no specific physical variant is required for that deck requirement, while `NORMAL`, `FOIL`, and `SHOWCASE` require that variant. The field is non-null with a default of `ANY` so SQLite can enforce one requirement row per deck, card, and preference through the composite unique index. `CardVariant` remains reserved for real physical variants on owned collection entries and assembled deck allocations.

Only allocations belonging to assembled decks should block global availability. Theoretical decks remain planning records and do not reduce availability.

Missing-card calculation, deck assembly allocation, and deck disassembly flows remain future domain, service, and UI work. Booster, price, provider, and sync tables are still future Phase 3 pull requests.

## Phase 3D scope

This schema increment adds only the booster persistence foundation:

- `BoosterSettings` stores user-configurable booster accrual settings, including the number of boosters per interval, interval length and unit, accrual anchor, and default opening decrement behavior.
- `BoosterCounterEvent` stores signed booster counter ledger events. Positive `quantityDelta` values add boosters and negative values remove boosters; opening decrement events may optionally link back to a recorded opening.
- `BoosterOpening` stores recorded booster opening sessions, including when the session was opened, how many boosters it represented, whether the counter should be decremented, status, and notes.
- `BoosterOpeningCard` stores pulled cards as aggregated quantities per opening, official card, and physical `CardVariant`.

The current booster count is intentionally not stored directly. It will be computed later from booster settings and counter events.

Automatic collection transactions, post-opening summaries, accumulated counter calculation, and rollback flows remain future service, domain, and UI work. Price, provider, and sync tables are also still future Phase 3 pull requests.

## Phase 3E scope

This schema increment adds only the price persistence foundation:

- `PriceProvider` stores interchangeable price provider definitions, status, priority, base URL, and non-secret configuration metadata. API keys and secrets must remain environment variables and must not be stored in this table.
- `PriceMapping` maps one local official card plus one physical `CardVariant` to a provider-specific product or listing identifier and provider-side variant/subtype identifier. `externalId` optionally identifies the provider product, listing, or card; it is nullable because `UNRESOLVED` mappings may not have a safe provider id yet, and callers must not invent sentinel ids such as `"UNRESOLVED"` or `"DEFAULT"` that could collide with real provider identifiers. `externalVariantId` remains non-null, defaults to `"DEFAULT"`, and identifies the provider-side variant or subtype for that provider product, such as a TCGCSV subtype row. Providers that do not expose a separate variant or subtype id must store `"DEFAULT"` so SQLite uniqueness remains reliable when `externalId` is known. `externalVariantLabel` may preserve human-readable provider labels, such as `subTypeName`, separately from the stable key. Provider-side mapping uniqueness is `providerId` + `externalId` + `externalVariantId`; SQLite allows multiple rows where the nullable `externalId` is `NULL`, so multiple unresolved mappings can be persisted without fake provider ids. The local `variant` field remains the app's physical owned variant mapping (`NORMAL`, `FOIL`, or `SHOWCASE`) and is separate from provider-specific subtype identifiers. `status` stores review state (`CONFIRMED`, `CANDIDATE`, `UNRESOLVED`, or `REJECTED`) and defaults to `UNRESOLVED` so id-less or placeholder mapping rows are safe by default. New mappings must be explicitly confirmed only after a safe provider id has been selected. `confidence` can store an optional app-level match score, and `matchSource` can identify how the mapping candidate was produced. `CONFIRMED` mappings are expected to have a usable `externalId` before future price synchronization uses them; future service/domain validation will enforce that sync only consumes confirmed mappings with provider ids and will enforce which statuses require external ids. Low-confidence, unresolved, or rejected mappings must not be silently applied by later price synchronization or value logic. Automatic/fuzzy matching behavior, unresolved mapping UI, manual mapping UI, and sync behavior remain future service and UI work.
- `CardPrice` stores provider price snapshots for a local card and physical variant. Each row represents one provider, card, physical variant, price type, currency, and fetch timestamp. `CardPriceType` supports market, low, mid, high, trend, 1-day average, 7-day average, 30-day average, and custom prices so Cardmarket-style trend and average price points can be queried separately instead of being collapsed into raw JSON. Multiple `CardPrice` rows can exist for different price types from the same provider. Later service/query logic will choose which price type to use for collection, deck, missing-card, booster, and market value calculations.
- `ManualPriceOverride` stores user-defined prices per card, physical variant, and currency. Manual overrides are independent from external providers and must win over provider prices later in service/domain logic.

Money amounts use `amountMinor` in minor currency units, such as cents for EUR.

This PR intentionally does not add value calculations, market pages, price provider synchronization, external API calls, collection value display, deck value display, missing deck value calculation, or booster opening value calculation. Those remain future service, domain, and UI work.

## Phase 3F scope

This schema increment adds only the sync persistence foundation:

- `SyncSetting` stores queryable, non-secret sync configuration for one `SyncTarget` and provider key, such as `riot`, `tcgcsv`, `justtcg`, or `cardmarket`. Settings default to `enabled = false`, so the app remains usable when every sync setting is disabled or provider credentials are unavailable. `localeChain` supports a future Riot official-data fallback chain, and `configJson` is reserved for non-secret provider configuration only. API keys, tokens, and credentials must stay in environment variables and must not be stored in this table.
- `SyncLog` stores append-only sync attempt results for later debugging and UI history. It records the sync target, provider key, status, optional trigger, timestamps, optional summary message, non-secret error details, item counts, and optional non-secret raw result metadata.

`OFFICIAL_DATA` is intended for future Riot card, set, asset, and localized metadata synchronization. `PRICE_DATA` is intended for future interchangeable price provider synchronization.

This PR intentionally does not add actual sync execution, scheduling, provider clients, Riot API calls, price provider API calls, conflict handling, import logic, API routes, or UI. Those remain future service, domain, and UI work.

## Official data and local state

The database stores official metadata and local application state, but it does not own business-rule decisions. Complex rules such as trackability, binder reservation, allowed variants, availability, deck allocation, booster summaries, and price precedence must stay in pure TypeScript modules under `src/lib/domain`.

Availability is never stored directly. It must be computed per card and per variant with the domain formula:

```text
available = owned - binderReserved - assembledDeckAllocated
```

Tokens and rules cards may be imported into official metadata when a provider exposes them, but collection and deckbuilding logic must ignore them. Energy cards remain trackable.

## Rarity, print treatment, collector numbers, and variants

Official rarity is stored separately from special print treatment and from owned physical variant or finish:

- `Card.rarity` stores the normalized Riftbound rarity used by official data queries. It currently supports `COMMON`, `UNCOMMON`, `RARE`, `EPIC`, `ULTIMATE`, and `UNKNOWN`.
- `Card.officialRarityRaw` preserves the exact provider or Riot rarity label when present. This lets sync code store future, localized, or provider-specific rarity values without forcing them into an inaccurate normalized enum value.
- `Card.printTreatment` stores the official printing/treatment concept for a card row. `REGULAR`, `ALT`, and `OVERNUMBER` are separated from rarity because official booster distribution distinguishes Rare, Epic, Alt, Overnumber, and Ultimate cards.
- `Card.printTreatmentRaw` preserves a provider-specific treatment label when the normalized enum is not expressive enough.
- `Card.collectorNumber` remains a `String?` because official card numbers may include suffixes, letters, stars, or overnumbered values rather than plain integers.

Special printings such as alternate-art or overnumbered cards should be represented as official card rows with their own collector number and print treatment when the provider exposes them that way. They must not be modeled only as collection variants.

The Prisma schema still defines the MVP `CardVariant` enum for physical collection tracking concepts:

- `NORMAL`
- `FOIL`
- `SHOWCASE`

`CardVariant` describes owned physical copies and finishes for later collection tables. It is not the source of truth for official alternate-art, overnumbered, or other print-treatment metadata.

`SHOWCASE_FOIL` is intentionally not part of the MVP schema. Variant-support rules remain domain logic rather than database logic.
