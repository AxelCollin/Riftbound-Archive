# Database schema

## Phase 3A scope

This schema foundation adds only the first official Riftbound card data tables:

- `Set` stores official set metadata.
- `Card` stores official card metadata, including normalized rarity, raw provider rarity, kind, print treatment, collector number, optional official image and artist fields, and the raw official provider payload when available.
- `CardTranslation` stores localized official card text by locale.

This PR intentionally does not add user collection, deck, booster, price, sync log, provider, or workflow tables. Those persistence concerns are planned for later Phase 3 pull requests so each schema change remains small and reviewable.

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
