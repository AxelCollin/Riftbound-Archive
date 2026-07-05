# Database schema

## Document status

This document describes the implemented Prisma/SQLite schema state and the known schema-direction changes required by Phase 7.5.

It is not a complete implementation history. Historical phase notes should be kept short and clearly marked as historical. For card taxonomy, `docs/CARD_TAXONOMY.md` is the more specific source of truth.

## Current implemented schema state

The current schema already contains foundations for:

- official card/set/translation metadata;
- user collection entries and collection transaction history;
- card user metadata;
- binder overrides;
- deck metadata, requirements, and assembled allocations;
- booster settings, counter events, openings, and pulled-card rows;
- price providers, mappings, provider price snapshots, and manual overrides;
- sync settings and sync logs.

The schema is still pre-Phase-7.5 for card taxonomy. It uses MVP concepts such as `CardVariant` and a normalized rarity enum that includes values which the target taxonomy will split differently.

## Official card metadata

Implemented official metadata tables include:

- `Set`: official set metadata.
- `Card`: official card metadata, including normalized rarity, raw provider rarity, kind, print treatment, collector number, optional official image URL, optional official artist, and raw provider payload when available.
- `CardTranslation`: localized official card text by locale.

Current limitations:

- `Card.kind` is a coarse MVP concept and does not yet represent the full target gameplay card type list from `docs/CARD_TAXONOMY.md`.
- `Card.rarity` currently supports `COMMON`, `UNCOMMON`, `RARE`, `EPIC`, `ULTIMATE`, and `UNKNOWN`. This is current implementation state, not the target taxonomy. In the target model, `ULTIMATE` belongs to showcase treatment, not gameplay rarity.
- `Card.printTreatment` stores a simplified official printing/treatment concept. This should evolve toward collector category and showcase treatment.
- `Card.collectorNumber` remains a nullable string because card numbers can include suffixes, letters, stars, or overnumbered values.
- A dedicated `CardAsset` table does not exist yet. The current schema stores official image URL and artist metadata directly on `Card`.

## Current collection schema

Implemented collection tables include:

- `CollectionEntry`: current owned quantity snapshot for one card and one current physical `CardVariant`.
- `CollectionTransaction`: append-only ownership history.
- `CardUserMeta`: user-specific card metadata such as favorites and notes.
- `BinderOverride`: optional future-facing user overrides for binder reservation behavior.

Current implemented ownership unit:

```text
cardId + CardVariant
```

Current `CardVariant` values:

- `NORMAL`
- `FOIL`
- `SHOWCASE`

This is an MVP implementation simplification. The target Phase 7.5 ownership unit is:

```text
printedCardId + physicalFinish
```

where Showcase is represented as a separate printed card / collector category, not as a simple physical finish beside Normal and Foil.

Collection transaction writes update both append-only history and the matching snapshot atomically. Snapshot writes reject any operation that would make the resulting owned quantity negative.

Availability is never stored directly. It is computed through domain/query composition.

## Current deck schema

Implemented deck tables include:

- `Deck`: user-created deck metadata, status, and allocation strategy.
- `DeckCard`: theoretical deck requirements.
- `DeckCardAllocation`: real allocated physical copies for assembled decks.

Current implementation state:

- `DeckCard.preferredVariant` uses `DeckCardVariantPreference`.
- `ANY` means no specific implemented physical variant is required.
- `NORMAL`, `FOIL`, and `SHOWCASE` still exist as current implementation preferences while Phase 7.5 migration is pending.
- `DeckCardAllocation` currently allocates by card and implemented variant.

Target Phase 7.5 direction:

- Deck requirements should be able to target gameplay identity.
- Physical allocations should choose a real printed card and physical finish.
- Showcase / collector printings should be usable only when explicitly allowed by the deck requirement or allocation strategy.

Only allocations belonging to assembled decks should block global availability. Theoretical decks remain planning records and do not reduce availability.

## Current booster schema

Implemented booster tables include:

- `BoosterSettings`: user-configurable booster accrual settings.
- `BoosterCounterEvent`: signed booster counter ledger events.
- `BoosterOpening`: recorded booster opening sessions.
- `BoosterOpeningCard`: aggregated pulled cards per opening, card, and current physical `CardVariant`.

The current booster count is intentionally not stored directly. It is computed from booster settings, persisted counter events, and virtual accrual since the current anchor.

Phase 7 uses these tables for:

- opening header records;
- optional counter decrements;
- merged pulled-card rows;
- collection `ADD` transactions;
- current owned snapshot updates;
- read-only post-opening summaries;
- safe rollback through compensating `REMOVE` transactions and optional `ROLLBACK` counter events.

Target Phase 7.5 direction:

- Replace fixed pulled-card rows in UX with dynamic rows.
- Move toward pulled card recording by printed card and physical finish.
- Preserve rollback safety guarantees during the migration.

## Current price schema

Implemented price tables include:

- `PriceProvider`: interchangeable price provider definitions, status, priority, base URL, and non-secret configuration metadata.
- `PriceMapping`: mapping between local card + current physical variant and provider product/listing/subtype identifiers.
- `CardPrice`: provider price snapshots.
- `ManualPriceOverride`: user-defined prices.

Current implementation state:

- Price tables still use the current `card + variant` language.
- That is schema foundation only; value calculation and price sync behavior are not implemented yet.

Target Phase 8 direction after Phase 7.5:

- Price by printed card and physical finish.
- Keep provider-side subtype identifiers separate from local finish/treatment taxonomy.
- Manual overrides must win over provider prices.
- Do not build value calculation on the old `SHOWCASE`-as-variant assumption.

Money amounts use `amountMinor` in minor currency units, such as cents for EUR.

## Current sync schema

Implemented sync tables include:

- `SyncSetting`: queryable, non-secret sync configuration by target and provider key.
- `SyncLog`: append-only sync attempt result history.

Current state:

- `OFFICIAL_DATA` is intended for future card, set, asset, and localized metadata synchronization.
- `PRICE_DATA` is intended for future interchangeable price provider synchronization.
- Actual provider clients, sync execution, scheduling, conflict handling, import logic, API routes, and UI remain future work.

API keys, tokens, and credentials must stay in environment variables and must not be stored in sync tables.

## Official data and local state separation

The database stores official metadata and local application state, but it does not own business-rule decisions.

Complex rules such as trackability, binder reservation, allowed finishes / temporary variants, availability, deck allocation, booster summaries, rollback safety, and price precedence must stay in pure TypeScript modules under `src/lib/domain`.

Official synchronized data:

- sets;
- cards;
- translations;
- future assets;
- sync logs;
- raw provider payloads preserved in local files.

User-owned data:

- collection entries;
- collection transactions;
- card user metadata;
- binder overrides;
- decks;
- deck cards;
- deck card allocations;
- booster settings;
- booster counter events;
- booster openings;
- booster opening cards;
- manual price overrides;
- app settings.

Price data:

- price providers;
- price mappings;
- card prices;
- provider raw payloads.

## Numeric validation expectations

SQLite currently relies on service and Zod validation for most numeric invariants instead of raw SQL `CHECK` constraints.

Signed numeric fields are intentional only where the domain requires deltas, such as `BoosterCounterEvent.quantityDelta`, where positive values add boosters and negative values remove boosters.

Before write flows persist data, service/Zod validation must reject invalid numeric values for fields that are snapshots, quantities, or money amounts. Collection quantities, deck requirement quantities, assembled allocation quantities, booster opening quantities, and price `amountMinor` values must be validated as non-negative or positive according to their domain meaning before writes.

Raw SQL `CHECK` constraints may be considered later as an additional database-level guard.

## Phase 7.5 schema migration direction

Phase 7.5 must correct the schema direction before Phase 8 pricing behavior is implemented.

Target additions or replacements may include:

- gameplay identity key or `GameplayIdentity` table;
- richer gameplay card type field;
- gameplay rarity separated from collector treatment;
- collector category;
- showcase treatment;
- physical finish enum with `NORMAL` and `FOIL`;
- printed-card-to-faction relation if provider data requires multiple factions;
- related printings / rules-equivalence helpers.

Migration must be incremental and reviewable. Existing data should not be destructively rewritten without a clear migration plan and tests.

## Historical note

Earlier Phase 3 and Phase 4 sub-phase notes described incremental schema work while the schema was being introduced. Those notes are historical context only. The sections above describe the current implemented schema and the Phase 7.5 target direction.
