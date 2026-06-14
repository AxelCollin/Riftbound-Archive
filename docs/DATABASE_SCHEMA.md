# Database schema

## Phase 3A scope

This schema foundation adds only the first official Riftbound card data tables:

- `Set` stores official set metadata.
- `Card` stores official card metadata, including rarity, kind, showcase availability, optional official image and artist fields, and the raw official provider payload when available.
- `CardTranslation` stores localized official card text by locale.

This PR intentionally does not add user collection, deck, booster, price, sync log, provider, or workflow tables. Those persistence concerns are planned for later Phase 3 pull requests so each schema change remains small and reviewable.

## Official data and local state

The database stores official metadata and local application state, but it does not own business-rule decisions. Complex rules such as trackability, binder reservation, allowed variants, availability, deck allocation, booster summaries, and price precedence must stay in pure TypeScript modules under `src/lib/domain`.

Availability is never stored directly. It must be computed per card and per variant with the domain formula:

```text
available = owned - binderReserved - assembledDeckAllocated
```

Tokens and rules cards may be imported into official metadata when a provider exposes them, but collection and deckbuilding logic must ignore them. Energy cards remain trackable.

## Variant foundation

The Prisma schema defines the MVP `CardVariant` enum with only:

- `NORMAL`
- `FOIL`
- `SHOWCASE`

`SHOWCASE_FOIL` is intentionally not part of the MVP schema. Variant-support rules remain domain logic rather than database logic.
