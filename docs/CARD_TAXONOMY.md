# Card taxonomy target

This document defines the intended Riftbound Archive card taxonomy after the Phase 7 milestone and before the Phase 8 Pricing MVP work.

The goal is to correct the MVP simplification where `NORMAL`, `FOIL`, and `SHOWCASE` were all treated as card variants. That model was useful for early milestones, but it is not precise enough for the collection, deckbuilding, booster, and pricing UX now planned.

## Design principle

A card must be described along several independent axes. Do not collapse gameplay type, gameplay rarity, physical finish, collector category, and faction into one field.

## Gameplay card type

Gameplay card type describes what kind of card it is in the game rules.

Initial known values include:

- `UNIT`
- `CHAMPION`
- `TERRAIN`
- `LEGEND`
- `SPELL`
- `RUNE`
- `TOKEN`
- `RULES`
- `UNKNOWN` / future provider-specific values

Important rules:

- `Terrain` and `Legend` are gameplay card types.
- `Terrain` and `Legend` are not collector treatments.
- `Terrain` and `Legend` are not equivalent to Showcase, Overnumber, Signed, Normal, or Foil.
- `Rune` represents Energy cards.
- `Token` and `Rules` are card types, but they remain ignored by normal collection/deckbuilding/availability flows unless a later feature explicitly needs them.

## Trackability

Trackability remains a domain decision derived from card data.

The app should continue to track:

- normal gameplay cards;
- Energy / Rune cards.

The app should continue to ignore in normal collection/deckbuilding flows:

- Token cards;
- Rules cards.

The function equivalent to `isTrackableCard(card)` should survive the taxonomy refactor, but it should no longer rely on a too-coarse notion of card type when richer card type data exists.

## Gameplay rarity

Gameplay rarity describes the normal rarity used by gameplay cards.

Known gameplay rarities:

- `COMMON`
- `UNCOMMON`
- `RARE`
- `EPIC`

Important rules:

- `Ultimate` is not a normal gameplay rarity.
- `Ultimate` belongs to the collector/showcase treatment axis.
- A `Legend` can be `RARE`.
- A `Terrain` can be `UNCOMMON` and can still support Normal/Foil finishes.

## Physical language

Physical language describes the printed language of a real physical card copy. Initial supported values are `FR`, `EN`, and `ZH`, with `UNKNOWN` reserved for legacy/imported rows where the printed language is not known. This is independent from `CardTranslation.locale`, which describes translated metadata used for display and search. A single printed card can exist in several physical languages, so language must not be stored as one field on `Card`.

## Physical finish

Physical finish describes the physical finish of a printed card.

Initial values:

- `NORMAL`
- `FOIL`

Important rules:

- The implemented physical finish constants are exactly `NORMAL` and `FOIL`.
- `SHOWCASE` is not a physical finish and must not be added to this axis.
- Normal and Foil are not rarities.
- Normal and Foil are not separate card records in the collection UI target.
- A normal gameplay card that supports both finishes should appear as one collection card with separate Normal and Foil quantities.
- Collection quantity editing should allow adjusting Normal and Foil independently while keeping them grouped under the same printed card where appropriate.

## Collector category

Collector category describes whether a printed card is part of the standard card library or a collector/showcase family.

Initial values:

- `STANDARD`
- `SHOWCASE`

Important rules:

- Showcase is not a physical finish equivalent to Foil.
- Showcase should not be modeled as a simple third finish next to Normal and Foil in the long-term model.
- A Showcase card should be represented as a separate printed card because it can have a different illustration, collector number, and collector treatment.
- Showcase cards are not automatically reserved by the binder.

## Showcase treatment

Showcase treatment describes the collector subtype of a Showcase printed card.

Initial known values:

- `ALTERNATIVE`
- `OVERNUMBER`
- `SIGNED`
- `ULTIMATE`
- `UNKNOWN` / future provider-specific values

Important rules:

- Alternative, Overnumber, Signed, and Ultimate are not gameplay card types.
- Alternative, Overnumber, Signed, and Ultimate are not physical finishes.
- Ultimate belongs here, not in gameplay rarity.

## Gameplay identity / rules equivalence

Different printed cards can be equivalent for gameplay rules.

Example:

- a standard printed card;
- its Showcase version;
- its Overnumber version;
- its Signed version;
- its Ultimate version.

These are distinct printed cards for collection, display, numbering, and pricing, but they can share a gameplay identity if they have equivalent rules.

The target model should introduce a concept such as:

```text
gameplayIdentityKey
```

or a dedicated table such as:

```text
GameplayIdentity
```

Required behavior:

- A printed card can link to its gameplay-equivalent printed cards.
- The card detail page can show `Autres impressions de cette carte`.
- Deckbuilding can eventually require a gameplay identity while physical allocation chooses a real printed card and finish.
- Pricing can eventually price each printed card and finish separately.

## Factions

Known Riftbound factions for filtering and completion statistics:

- `FURY`
- `CALM`
- `MIND`
- `BODY`
- `CHAOS`
- `ORDER`

Important rules:

- Faction is distinct from gameplay card type.
- Faction is distinct from rarity.
- Faction is distinct from physical finish.
- Faction filtering should be data-driven and should not be implemented as a fixed dropdown-only UX.
- The future model should allow one or more factions per printed card if provider data requires it.

## Current MVP simplification to replace

The current MVP model uses a variant concept similar to:

```text
NORMAL | FOIL | SHOWCASE
```

This must be treated as a historical simplification. The target model is:

```text
Printed card
├─ gameplayType
├─ gameplayRarity
├─ collectorCategory
├─ showcaseTreatment, when collectorCategory = SHOWCASE
├─ supported physical finishes: NORMAL / FOIL
├─ faction(s)
└─ gameplay identity / rules-equivalent group
```

## Phase 7.5H closure audit

The finish-aware model is coherent enough to close the Phase 7.5 parent item before the UX slices begin. The current boundary is:

- printed card identity, numbering, art, collector category, showcase treatment, gameplay type, rarity, faction, and gameplay identity live on `Card` rows;
- physical finish is the separate `PhysicalFinish` axis and is limited to `NORMAL` and `FOIL`;
- Showcase is represented by `collectorCategory = SHOWCASE` plus an optional `showcaseTreatment`, not by a physical finish value;
- `CardVariant.SHOWCASE` remains temporarily in `CARD_VARIANTS`, deck preferences, filters, persisted compatibility columns, and display helpers so existing storage and UI paths can keep reading legacy data;
- compatibility helpers that derive a physical finish from a legacy variant must return `null` for `SHOWCASE`; and
- the known legacy `variant` columns are compatibility columns, not the target domain model.

Audit classification for remaining `SHOWCASE`-as-variant references:

1. Legacy compatibility storage/read fallback: Prisma enum values and nullable `variant` columns remain on collection entries, transactions, binder overrides, deck allocations, booster opening cards, and pricing tables. Normal/Foil rows prefer `physicalFinish`; legacy Showcase rows keep `physicalFinish = NULL`.
2. UI/display compatibility: existing labels, collection filters, deck preference controls, and availability/detail rows may still display legacy Showcase quantities where older paths expose them. This is compatibility surface only and does not add `SHOWCASE` to `PhysicalFinish`.
3. Incorrect physical-finish behavior: no known runtime path remains that maps `SHOWCASE` to a physical finish.

## Migration direction

The refactor should be incremental and reviewable.

Recommended order:

1. Add this taxonomy documentation.
2. Add gameplay identity and corrected taxonomy fields.
3. Introduce finish-aware collection data.
4. Stop treating Showcase as a simple variant in collection display.
5. Adapt collection, binder, availability, deck allocation, booster opening, and card detail queries to the new model.
6. Only then build Phase 8 pricing on top of the corrected structure.

## Document scope

This document does not implement schema changes, migrations, provider mapping, pricing, or UI changes. It defines the target vocabulary so later PRs can implement the model safely.
