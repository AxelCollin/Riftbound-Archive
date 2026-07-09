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

The schema now includes Phase 7.5A foundations for corrected card taxonomy and gameplay identity, plus the Phase 7.5B-7.5H finish-aware collection foundation. `CollectionEntry` and `CollectionTransaction` now persist a separate nullable `physicalFinish` axis for `NORMAL` and `FOIL` while retaining legacy `CardVariant` for compatibility. Deck allocations, binder overrides, and booster opening-card rows now also persist nullable `physicalFinish` for `NORMAL`/`FOIL` while retaining legacy `variant` columns for compatibility. Price tables now also persist nullable `physicalFinish` for `NORMAL`/`FOIL` compatibility rows while retaining legacy `CardVariant` columns until Phase 8 pricing behavior can use `printed card + physical finish` end to end. Phase 7.5H audited the remaining compatibility surface and found no known runtime path that converts legacy `SHOWCASE` into a physical finish. Phase 7.5J adds a separate physical `CardLanguage` axis (`FR`, `EN`, `ZH`, `UNKNOWN`) for owned copies, booster rows, deck allocations, binder overrides, and pricing compatibility rows. This axis is intentionally separate from `CardTranslation.locale`, which remains UI/card-text translation metadata.

## Official card metadata

Implemented official metadata tables include:

- `Set`: official set metadata.
- `Card`: official card metadata, including MVP compatibility fields (`rarity`, `kind`, `printTreatment`) and Phase 7.5A taxonomy fields (`gameplayIdentityKey`, `gameplayType`, `gameplayRarity`, `collectorCategory`, and optional `showcaseTreatment`).
- `CardFactionMembership`: one-or-more faction memberships per card for the Phase 7.5A taxonomy foundation.
- `CardTranslation`: localized official card text by locale.

Current limitations:

- `Card.kind` remains as a coarse MVP compatibility concept while `Card.gameplayType` carries the corrected Phase 7.5A gameplay type axis.
- `Card.rarity` still supports `COMMON`, `UNCOMMON`, `RARE`, `EPIC`, `ULTIMATE`, and `UNKNOWN` for compatibility. `Card.gameplayRarity` is the corrected Phase 7.5A gameplay rarity field and excludes `ULTIMATE`; Ultimate belongs to the showcase treatment axis.
- `Card.printTreatment` remains as a simplified compatibility field. `Card.collectorCategory` and `Card.showcaseTreatment` are implemented as the Phase 7.5A target taxonomy fields.
- `Card.collectorNumber` remains a nullable string because card numbers can include suffixes, letters, stars, or overnumbered values.
- A dedicated `CardAsset` table does not exist yet. The current schema stores official image URL and artist metadata directly on `Card`.

## Current collection schema

Implemented collection tables include:

- `CollectionEntry`: current owned quantity snapshot for one card and one legacy `CardVariant`, with a Phase 7.5B nullable `physicalFinish` column for `NORMAL`/`FOIL` ownership.
- `CollectionTransaction`: append-only ownership history.
- `CardUserMeta`: user-specific card metadata such as favorites and notes.
- `BinderOverride`: optional user overrides for binder reservation behavior. It keeps the legacy nullable `variant` column and now adds nullable `physicalFinish` for Normal/Foil intent; legacy `SHOWCASE` override rows keep `physicalFinish = NULL`.

Current compatibility ownership key:

```text
cardId + CardVariant
```

Current `CardVariant` values:

- `NORMAL`
- `FOIL`
- `SHOWCASE`

Phase 7.5B also persists this foundation for rows whose legacy variant is `NORMAL` or `FOIL`:

```text
cardId + physicalFinish
```

`physicalFinish` values are limited to `NORMAL` and `FOIL`. There is intentionally no `SHOWCASE` physical finish; legacy `SHOWCASE` compatibility rows keep `physicalFinish = NULL` until they are migrated to separate Showcase printed cards or otherwise removed from remaining compatibility paths. Collection and card-detail reads prefer `physicalFinish` for Normal/Foil quantities when present, with a legacy `CardVariant` fallback only for older Normal/Foil rows. The target Phase 7.5 ownership unit is:

```text
printedCardId + physicalFinish + cardLanguage
```

`cardLanguage` is required on `CollectionEntry`, `CollectionTransaction`, `DeckCardAllocation`, `BinderOverride`, `BoosterOpeningCard`, `PriceMapping`, `CardPrice`, and `ManualPriceOverride`, with `UNKNOWN` as the legacy/import fallback. Existing quantity and availability reads currently aggregate across all physical languages unless a future function explicitly becomes language-aware.

where Showcase is represented as a separate printed card / collector category, not as a simple physical finish beside Normal and Foil.

Collection transaction writes update both append-only history and the matching snapshot atomically. Snapshot writes reject any operation that would make the resulting owned quantity negative.

Availability is never stored directly. It is computed through domain/query composition.

## Current deck schema

Implemented deck tables include:

- `Deck`: user-created deck metadata, status, and allocation strategy.
- `DeckCard`: theoretical deck requirements.
- `DeckCardAllocation`: real allocated physical copies for assembled decks. It keeps the legacy `variant` column and now stores nullable `physicalFinish` for `NORMAL`/`FOIL` allocation rows. Legacy `SHOWCASE` rows keep `physicalFinish = NULL`.

Current implementation state:

- `DeckCard.preferredVariant` uses `DeckCardVariantPreference`.
- `ANY` means no specific implemented physical variant is required.
- `NORMAL`, `FOIL`, and `SHOWCASE` still exist as current implementation preferences while Phase 7.5 migration is pending.
- `DeckCardAllocation` currently allocates by card and implemented variant, with Phase 7.5D `physicalFinish` preferred for `NORMAL`/`FOIL` availability consumption.

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
- `BoosterOpeningCard`: aggregated pulled cards per opening, card, and legacy `CardVariant`, with a Phase 7.5F nullable `physicalFinish` column for Normal/Foil pull intent.

The current booster count is intentionally not stored directly. It is computed from booster settings, persisted counter events, and virtual accrual since the current anchor.

Phase 7 uses these tables for:

- opening header records;
- optional counter decrements;
- merged pulled-card rows;
- collection `ADD` transactions;
- current owned snapshot updates;
- read-only post-opening summaries;
- safe rollback through compensating `REMOVE` transactions and optional `ROLLBACK` counter events.

Phase 7.5F compatibility state:

- New pulled-card rows persist `physicalFinish = NORMAL` for legacy `variant = NORMAL` and `physicalFinish = FOIL` for legacy `variant = FOIL`.
- Legacy `BoosterOpeningCard` rows are backfilled the same way for Normal/Foil rows.
- Legacy `SHOWCASE` booster rows intentionally keep `physicalFinish = NULL`; Showcase is not a physical finish and must not be converted into Normal/Foil pull history.
- Booster summaries prefer persisted `physicalFinish` when present, fall back only for legacy Normal/Foil rows, and tolerate legacy Showcase rows without crashing.

Target Phase 7.5 direction:

- Replace fixed pulled-card rows in UX with dynamic rows.
- Move toward pulled card recording by printed card and physical finish.
- Preserve rollback safety guarantees during the migration.

## Current price schema

Implemented price tables include:

- `PriceProvider`: interchangeable price provider definitions, status, priority, base URL, and non-secret configuration metadata.
- `PriceMapping`: mapping between local card + legacy `CardVariant` compatibility rows and provider product/listing/subtype identifiers, with nullable `physicalFinish` for Normal/Foil rows and `cardLanguage` for future language-specific provider rows.
- `CardPrice`: provider price snapshots, with nullable `physicalFinish` for Normal/Foil rows and `cardLanguage` for future language-specific rows.
- `ManualPriceOverride`: user-defined prices, with nullable `physicalFinish` for Normal/Foil rows and `cardLanguage` for future language-specific overrides.

Current implementation state:

- Price tables keep the current `card + variant` compatibility columns and unique constraints.
- Phase 7.5G backfills `physicalFinish = NORMAL` for legacy `variant = NORMAL`, `physicalFinish = FOIL` for legacy `variant = FOIL`, and keeps legacy `variant = SHOWCASE` pricing rows at `physicalFinish = NULL`.
- Pricing compatibility helpers prefer persisted `physicalFinish`, fall back only from legacy Normal/Foil variants, and never convert legacy Showcase rows into Normal/Foil price rows.
- This is schema foundation only; value calculation, provider sync behavior, and pricing screens are not implemented yet.

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

Implemented in Phase 7.5A:

- `Card.gameplayIdentityKey`;
- `Card.gameplayType`;
- `Card.gameplayRarity`;
- `Card.collectorCategory`;
- `Card.showcaseTreatment`;
- `CardFactionMembership`;
- indexes for gameplay identity, gameplay type, gameplay rarity, collector category, showcase treatment, and faction filtering.

Still pending for later Phase 7.5 work:

- fully replacing compatibility `CardVariant` read paths after Phase 8 pricing and provider work can consume printed card + physical finish keys end to end;
- richer related-printings queries and UI;
- optional dedicated `GameplayIdentity` table if string keys are not sufficient after provider sync work.

Migration must remain incremental and reviewable. Existing data should not be destructively rewritten without a clear migration plan and tests.

## Historical note

Earlier Phase 3 and Phase 4 sub-phase notes described incremental schema work while the schema was being introduced. Those notes are historical context only. The sections above describe the current implemented schema and the Phase 7.5 target direction.
