# Domain rules

This document is the canonical source for Riftbound Archive business rules.

## Tracked and ignored cards

The app must track:

- normal gameplay cards;
- Energy cards.

The app must ignore:

- tokens;
- rules cards.

Ignored cards must not appear in:

- collection completion;
- collection transaction write flows;
- deckbuilding;
- availability calculations;
- binder reservation;
- missing-card summaries;
- booster useful-card summaries.

Implement a configurable function equivalent to:

```ts
isTrackableCard(card)
```

It must return `false` for tokens and rules cards, and `true` for Energy cards.

## Variants and rarity rules

Supported variants for the MVP:

```ts
type CardVariant = "NORMAL" | "FOIL" | "SHOWCASE";
```

Rules:

- Common and Uncommon cards support normal and foil variants.
- All other rarities are considered foil-only by default.
- A single Showcase variant is tracked separately from regular Foil if present.
- Showcase cards are never automatically reserved for the binder.
- Variant support must remain extensible because providers may expose more precise variants later.

Collection transaction recording writes append-only history and updates the owned snapshot for the same card and variant. It must validate the card, card kind, variant, transaction type, and quantity, then create a `CollectionTransaction` history row and update or create the matching `CollectionEntry` snapshot atomically. `CollectionTransaction` rows remain append-only and must not be overwritten. `CollectionEntry` is the current owned quantity snapshot derived from valid transaction writes, and its quantity must never become negative. Binder reservation, deck allocation, and availability calculations remain separate future work.

## Binder reservation

Default binder behavior:

- Reserve one copy of every trackable non-showcase card.
- Prefer a regular foil copy.
- If no regular foil is owned and the card supports normal, reserve one normal copy.
- If neither is available, reserve nothing.
- Never reserve showcase automatically.

Examples:

- 3 normal, 0 foil common: reserve 1 normal, 2 normal available.
- 3 normal, 1 foil common: reserve 1 foil, 3 normal available, 0 foil available.
- 2 foil rare: reserve 1 foil, 1 foil available.
- 1 showcase only: reserve nothing, 1 showcase available.
- 1 regular foil and 1 showcase: reserve 1 regular foil, showcase remains available.

Overrides may exist later:

```ts
type BinderMode = "AUTO" | "DISABLED" | "FORCE_VARIANT";
```

## Availability formula

Availability is always computed per card and per variant:

```text
available = owned - binderReserved - assembledDeckAllocated
```

This is the raw conceptual formula. The current app-facing available-count helper returns a UI-safe value clamped at `0` when the raw result would be negative because of over-reservation, over-allocation, or invalid persisted data.

Future Phase 5 explanation and diagnostic logic must surface invalid over-reservation or over-allocation separately. It must not rely only on the clamped available count to decide whether the underlying data is valid.

Never duplicate this formula or its clamping policy in UI components. Phase 5A composes owned, binder-reserved, and app-facing available quantities server-side for collection and card-detail query rows. Phase 5B adds a collection UI toggle that selects between those already-computed owned and available row fields. The binder page and availability explanation UI remain future Phase 5 work.

## Deck rules

A deck can contain cards the user does not own.

Deck statuses:

- Non-assembled: theoretical deck, does not block cards.
- Assembled: physical deck, blocks allocated cards from global availability.

When a deck is assembled:

- Allocate real card variants.
- Persist allocations.
- Recompute global availability.
- Show cards that are missing or unavailable.

When a deck is disassembled:

- Remove persisted allocations.
- Recompute availability.

Default automatic allocation strategy:

```text
preserve_premium_variants
```

For commons and uncommons:

1. Use regular normal copies first.
2. Use regular foil copies second.
3. Use showcase copies only if allowed by the deck or card line.

For foil-only rarities:

1. Use regular foil copies first.
2. Use showcase copies only if allowed.

## Booster counter rules

Default booster generation:

```text
+1 booster per day
```

The user can configure:

- number of boosters generated per period;
- period length;
- period unit;
- manual count adjustments.

Unopened boosters accumulate.

Opening a booster:

- decrements the counter by 1 by default;
- can be marked as not decrementing the counter;
- creates collection transactions for entered cards;
- creates a booster opening history record;
- produces a post-opening summary.

The summary should include:

- new cards;
- cards newly useful for the binder;
- cards useful for existing incomplete decks;
- cards that reduce missing deck quantities;
- duplicates;
- booster value;
- best pull by value;
- availability impact.

Rollback should be supported when feasible.

## Price rules

Prices are stored per card and per variant.

The price system must support:

- provider price;
- manual override;
- unknown price;
- currency;
- provider raw payload;
- last update date.

Manual override must always win over provider price when active.

Values to compute:

- card variant value;
- total owned value for a card;
- collection total value;
- binder-reserved value;
- available value;
- assembled-deck locked value;
- deck total value;
- deck owned value;
- deck missing value;
- booster opening value.

## Required pure functions

The domain layer should eventually expose pure functions equivalent to:

- `isTrackableCard`
- `getAllowedVariants`
- `getBinderReservation`
- `getAvailableCount`
- `getDeckMissingCards`
- `assembleDeck`
- `disassembleDeck`
- `syncBoosterCounter`
- `openBooster`
- `rollbackBoosterOpening`
- `getCardVariantPrice`
- `getOwnedCardValue`
- `getCollectionTotalValue`
- `getDeckTotalValue`
- `getDeckOwnedValue`
- `getDeckMissingValue`
- `getBoosterOpeningValue`
