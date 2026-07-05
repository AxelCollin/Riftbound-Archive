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
isTrackableCard(card);
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

Never duplicate this formula or its clamping policy in UI components. Phase 5A composes owned, binder-reserved, and app-facing available quantities server-side for collection and card-detail query rows. Phase 5B adds a collection UI toggle that selects between those already-computed owned and available row fields. Phase 5C adds a read-only binder page that exposes the current automatic reservation state without overrides, editing, or write flows. Phase 5D adds a read-only per-card availability explanation page that surfaces owned copies, binder reservations, assembled-deck allocations, raw availability, and the app-facing clamped availability value. Binder editing, binder overrides, deck pages, and deck allocation editing remain future work.

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

Phase 6A adds pure domain logic for normalizing deck requirements and calculating missing cards from already-computed availability. It does not persist decks, deck cards, or deck allocations, and it does not add deck CRUD, deck pages, assembly, disassembly, or deckbuilder UI.

Phase 6B adds a read-only deck list page backed by a server-side query over existing deck tables. It may display saved deck metadata, requirement line counts, required card totals, allocation line counts, and allocated card totals. It must not create, edit, delete, assemble, disassemble, allocate, or persist deck data, and missing-card query composition remains future work.

Phase 6C adds minimal Deck metadata writes. A new deck is always created with status `THEORETICAL`; status editing, assembly, and disassembly are not exposed. Metadata writes may only normalize and persist the deck name, optional description, and allocation strategy. They must not create, update, or delete `DeckCard` or `DeckCardAllocation` rows. Deck card requirement persistence, deck card editing UI, missing-card UI, assembled allocation writes, disassembly, and deckbuilder UI remain future work.

Phase 6D adds read-only deck detail display. The `/decks/[deckId]` page may read and display persisted `Deck`, `DeckCard`, and `DeckCardAllocation` data with totals, but it must not create, update, or delete deck card requirements or allocations. Card search/add/remove UI, missing-card UI, assembly, disassembly, and deckbuilder editing remain future work.

Phase 6E adds DeckCard requirement writes only. Requirement write input must trim and require `cardId`, require a positive integer quantity, and accept only `ANY`, `NORMAL`, `FOIL`, or `SHOWCASE` preferred variants. Requirement services may create, increment, update, merge, or delete `DeckCard` rows for trackable GAMEPLAY and ENERGY cards only. Exact preferred variants must match the selected card's supported variants, while `ANY` is allowed for any trackable card. Phase 6E must not create, update, delete, or clean up `DeckCardAllocation` rows; allocation cleanup, missing-card UI, assembled allocation writes, disassembly, automatic allocation persistence, and full deckbuilder UI remain future work.

Phase 6F adds read-only missing-card UI on the deck detail page. It must compare persisted DeckCard requirements against current app-facing available counts, where available means owned minus binder-reserved copies minus assembled deck allocations with the existing UI-safe clamping semantics. Phase 6F must reuse the Phase 6A missing-card domain logic and must not persist `usedVariants`, write DeckCardAllocation rows, assemble or disassemble decks, mutate collection entries or transactions, change deck status, or add purchase/pricing integration. Assembled allocation writes, automatic allocation persistence, disassembly, deckbuilder UI, and missing-card purchase/pricing integration remain future work.

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

Missing-card calculations must satisfy exact variant requirements before flexible `ANY` requirements for the same card. Flexible `ANY` requirements use remaining availability in preserve-premium order: normal first, foil second, showcase last. One available copy must not satisfy multiple requirements.

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

Phase 7A stores the minimal counter settings before counter accrual exists: daily generated boosters must be a non-negative integer, allowing `0` to intentionally pause future accrual, and the default opening decrement flag must be boolean.

Phase 7B calculates the read-only accumulated booster allowance from persisted `BoosterSettings` plus the `BoosterCounterEvent` ledger. The displayed counter is the sum of persisted `BoosterCounterEvent.quantityDelta` values plus virtual accrual since `accrualAnchorAt`. Virtual accumulation counts only complete elapsed intervals since `accrualAnchorAt`, uses elapsed milliseconds with UTC timestamps to avoid local-time drift, clamps future timestamps to zero accumulated boosters, and remains integer-only. `boostersPerInterval` is multiplied by the number of complete intervals; `boostersPerInterval = 0` produces zero virtual accumulated boosters. The calculation must receive an explicit `now` from the caller. When accrual-affecting settings change, pending virtual accrual from the old settings must first be materialized as an `ACCRUAL` `BoosterCounterEvent`, then `accrualAnchorAt` must reset to the update time so the new rate applies only to future complete intervals. Rate changes are not retroactive and must not recalculate already-earned boosters. If no settings row exists, Phase 7A defaults are used with a safe current-time anchor so the calculated counter starts at zero.

Unopened boosters accumulate.

Opening a booster from Phase 7D onward:

- creates a `BoosterOpening` history record with a positive integer booster count, an explicit decrement choice, and an optional trimmed note;
- persists a default `BoosterSettings` row with Phase 7A defaults and `accrualAnchorAt = openedAt` before the opening is recorded when no settings row exists yet;
- defaults the decrement choice in the UI from `BoosterSettings.autoDecrementOnOpening`;
- if decrementing, first materializes any pending virtual accrual up to `openedAt` as an `ACCRUAL` counter event, advances the accrual anchor only to the last materialized interval boundary so partial accrual progress is preserved, then creates an `OPENING_DECREMENT` `BoosterCounterEvent` with `quantityDelta = -boosterCount`;
- if not decrementing, creates no opening decrement counter event;
- does not require the counter to be sufficient and may make the displayed counter negative;
- is atomic across default settings creation, the opening row, pending accrual materialization, accrual-anchor update, optional opening decrement event, pulled-card rows, collection transactions, and owned collection snapshot updates;
- may remain header-only when no pulled-card rows are submitted;
- ignores intentionally empty pulled-card rows and rejects partially filled rows;
- merges duplicate pulled-card rows for the same card and variant by summing their positive quantities before persistence;
- accepts pulled cards only for trackable `GAMEPLAY` and `ENERGY` cards and rejects `TOKEN`, `RULES`, unknown card ids, invalid variants, and zero or negative quantities;
- creates one `BoosterOpeningCard` per merged pulled card and variant;
- creates matching `ADD` `CollectionTransaction` rows with positive quantities, `source = booster-opening:<openingId>`, and a note identifying the booster origin;
- increments an existing `CollectionEntry` quantity or creates the matching entry when absent;
- does not store availability directly and does not mutate binder reservations or assembled deck allocations;
- supports a read-only Phase 7E post-opening summary for a persisted opening;
- supports Phase 7F safe rollback when the persisted opening, source transactions, and current collection quantities prove a non-negative reversal.

The Phase 7E post-opening summary reads persisted local rows only. It uses `BoosterOpening` for header data, `BoosterOpeningCard` for pulled-card rows, `CollectionTransaction` rows sourced as `booster-opening:<openingId>` for cards added to collection history, current `CollectionEntry` rows for post-opening collection quantities, and local `Card`, `Set`, and `CardTranslation` rows for display metadata. It shows the number of boosters opened, whether the counter was decremented, distinct pulled-card row count, total pulled-card quantity, each pulled card with the established French display-name fallback, set code, collector number, variant, and quantity, collection entries classified as newly created or existing/incremented when the persisted post-opening quantity supports that distinction, and total cards added to the collection. Viewing the summary must not mutate data, create extra collection transactions, re-run an opening, recalculate writes from form input, or require pricing data. Phase 7F may expose rollback eligibility and a rollback action from this read-only summary, but the summary read itself must not perform the rollback. Missing or invalid opening ids must be handled safely with no crash.

Future summaries may add binder usefulness, deck usefulness, missing-deck reductions, duplicates, value, best pull, and availability impact in later phases.

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

## Booster opening rollback

Booster openings are historical records and must not be deleted during rollback. A rollback is allowed only while the opening status is `RECORDED`; a `ROLLED_BACK` opening must fail cleanly and must not reverse collection or counter data a second time.

A safe rollback must prove that each `BoosterOpeningCard` row still has a matching `CollectionEntry` and matching original source `ADD` collection transaction quantity for `booster-opening:<openingId>`. If an entry is missing, source transactions are missing or inconsistent, or subtracting the pulled quantity would make any `CollectionEntry.quantity` negative, rollback is blocked with a controlled French error. Rollback never touches binder overrides or deck allocations directly and never recalculates availability itself; availability reflects the updated owned quantities through the existing formula.

When rollback is safe, all writes must be atomic in one Prisma transaction. The service marks the opening as `ROLLED_BACK`, decrements each matching collection entry by the pulled quantity, appends positive `REMOVE` collection transactions sourced as `booster-opening-rollback:<openingId>`, and keeps zero-quantity collection entries rather than deleting them. If the original opening created an `OPENING_DECREMENT` counter event, rollback appends one `ROLLBACK` counter event with a positive quantity equal to the opening booster count. Original openings, pulled-card rows, original `ADD` transactions, and original counter events remain preserved for history.
