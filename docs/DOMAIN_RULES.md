# Domain rules

## Document status

This document is the canonical source for Riftbound Archive business rules.

It should describe current rules and clearly named target rules. It should not be used as a detailed implementation history. When historical MVP simplifications still exist in code, this document names them as temporary implementation state and points to the target rule.

For card taxonomy details, `docs/CARD_TAXONOMY.md` is the more specific source of truth.

## Trackable and ignored cards

The app must track:

- standard gameplay cards;
- Rune / Energy cards;
- collector printings that are trackable physical cards, such as Showcase cards, unless a later rule explicitly excludes them.

The app must ignore in normal collection, deckbuilding, binder, availability, and booster useful-summary flows:

- Token cards;
- Rules cards.

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

It must return `false` for Token and Rules cards, and `true` for Rune / Energy cards.

## Card taxonomy rule

Do not collapse card taxonomy into a single `variant` field.

Phase 7.5A implements the corrected taxonomy fields and gameplay identity foundation in the schema and domain helpers. Phase 7.5B adds a finish-aware foundation for collection snapshots and transaction history by persisting `physicalFinish` separately from the legacy `CardVariant`. Some collection, deck, booster, and pricing flows still consume old MVP `CardVariant` compatibility units until later Phase 7.5 migration work.

The target taxonomy separates:

- gameplay card type;
- gameplay rarity;
- physical finish;
- collector category;
- showcase treatment;
- faction;
- gameplay identity / rules equivalence.

### Current MVP implementation state

The current pre-Phase-7.5 implementation still uses an MVP variant concept similar to:

```ts
type CardVariant = "NORMAL" | "FOIL" | "SHOWCASE";
```

That is historical implementation debt. It remains relevant only while the migration is in progress. When compatibility code maps this value to a physical finish, only `NORMAL` and `FOIL` map to finishes; `SHOWCASE` maps to no physical finish.

### Phase 7.5 target state

The target model is:

- `NORMAL` and `FOIL` are physical finishes.
- `SHOWCASE` is not a finish equivalent to Foil.
- Showcase is a collector category for separate printed cards.
- Alternative, Overnumber, Signed, and Ultimate are showcase treatments, not gameplay card types and not physical finishes.
- Gameplay rarity uses Common, Uncommon, Rare, and Epic.
- Ultimate does not belong in gameplay rarity.
- Standard and collector printings can share a gameplay identity when they have equivalent rules.

New code should move toward the target model and must not deepen the old `SHOWCASE`-as-simple-variant assumption unless explicitly documented as temporary migration work.

## Physical finish support

Current domain rules must keep supporting the implemented MVP until Phase 7.5 migrates it.

Current behavior:

- Common and Uncommon standard cards support Normal and Foil in the MVP rules.
- Higher rarities are conservatively treated as foil-only unless data proves otherwise.
- The current MVP may still expose Showcase through `CardVariant` while migration is incomplete.

Target behavior:

- Finish support should be data-driven per printed card.
- Standard printed cards can group Normal and Foil quantities in collection UI.
- Showcase printed cards are separate printed cards and can have their own supported physical finishes according to real provider data.

## Collection transaction rules

Collection transaction recording writes append-only ownership history and updates the owned snapshot for the same implemented ownership unit.

Current implemented compatibility ownership unit:

```text
cardId + CardVariant
```

Phase 7.5B persisted finish foundation:

```text
cardId + physicalFinish
```

for `NORMAL` and `FOIL` collection snapshot/history rows. Legacy `SHOWCASE` compatibility rows must not receive a physical finish.

Target ownership unit after Phase 7.5:

```text
printedCardId + physicalFinish
```

Rules:

- Validate the card exists.
- Reject non-trackable Token and Rules cards.
- Validate the supported finish or temporary implemented variant.
- Validate transaction type and quantity.
- Create a `CollectionTransaction` history row.
- Update or create the matching `CollectionEntry` snapshot atomically.
- Keep `CollectionTransaction` append-only.
- Never allow `CollectionEntry.quantity` to become negative.
- Do not directly reserve binder cards.
- Do not directly allocate deck cards.
- Do not persist availability.

Binder reservation, deck allocation, and availability calculations are composed separately by domain, query, and service layers.

## Binder reservation

Default binder behavior:

- Reserve one copy of every trackable non-showcase printed card.
- Prefer a regular foil copy.
- If no regular foil is owned and the card supports normal copies, reserve one normal copy.
- If neither is available, reserve nothing.
- Never reserve Showcase automatically.

Examples under the current implemented model:

- 3 normal, 0 foil common: reserve 1 normal, 2 normal available.
- 3 normal, 1 foil common: reserve 1 foil, 3 normal available, 0 foil available.
- 2 foil rare: reserve 1 foil, 1 foil available.
- 1 showcase-only MVP variant: reserve nothing, 1 available.
- 1 regular foil and 1 showcase MVP variant: reserve 1 regular foil, showcase remains available.

Future overrides may exist later:

```ts
type BinderMode = "AUTO" | "DISABLED" | "FORCE_FINISH";
```

If the current implementation still uses `FORCE_VARIANT`, treat that name as temporary pre-taxonomy wording.

## Availability formula

Availability is conceptually always computed as:

```text
available = owned - binderReserved - assembledDeckAllocated
```

Current implemented granularity:

```text
per card + CardVariant
```

Target Phase 7.5 granularity:

```text
per printed card + physical finish
```

This is the raw conceptual formula. The app-facing helper may return a UI-safe value clamped at `0` when raw availability would be negative because of over-reservation, over-allocation, or invalid persisted data.

Never duplicate this formula or its clamping policy in UI components.

## Deck rules

A deck can contain cards the user does not own.

Deck statuses:

- `THEORETICAL`: planning deck, does not block cards.
- `ASSEMBLED`: physical deck, blocks allocated cards from global availability.
- `ARCHIVED`: historical or hidden deck, behavior should remain explicit in service/query code.

When a deck is assembled:

- allocate real owned copies;
- persist allocations;
- recompute global availability through existing query/domain composition;
- show missing or unavailable cards.

When a deck is disassembled:

- remove persisted allocations;
- return the deck to theoretical status;
- recompute availability through existing query/domain composition.

Default automatic allocation strategy:

```text
preserve_premium_variants
```

Current implemented preserve-premium order:

1. Use regular normal copies first when supported.
2. Use regular foil copies second.
3. Use showcase copies only if allowed by the deck or requirement.

Target preserve-premium order after taxonomy migration:

1. Use standard Normal copies first when supported.
2. Use standard Foil copies second.
3. Use collector / Showcase printings only if allowed by the deck or requirement.

Missing-card calculations must satisfy exact physical requirements before flexible `ANY` requirements for the same card or gameplay identity. One available physical copy must not satisfy multiple requirements.

Long-term deck requirements should be able to target gameplay identity while physical allocation chooses a real printed card and physical finish.

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

- creates a `BoosterOpening` history record with a positive integer booster count, an explicit decrement choice, and an optional trimmed note;
- defaults the decrement choice from booster settings;
- may optionally decrement the counter;
- does not require the counter to be sufficient and may make the displayed counter negative;
- is atomic across opening, counter events, pulled-card rows, collection transactions, and owned snapshot updates;
- may remain header-only when no pulled-card rows are submitted;
- ignores intentionally empty pulled-card rows and rejects partially filled rows;
- merges duplicate pulled-card rows for the same ownership unit before persistence;
- creates collection `ADD` transactions for valid pulled cards;
- does not store availability directly;
- does not mutate binder reservations or assembled deck allocations directly.

The Phase 7 implementation currently uses a small fixed pulled-card row set. Phase 7.5 UX target replaces that with a dynamic list.

## Booster opening summary

The current post-opening summary reads persisted local rows only. It must not mutate data, create extra collection transactions, re-run an opening, recalculate writes from form input, or require pricing data.

Current summary scope:

- boosters opened;
- decrement status;
- pulled-card rows;
- total pulled-card quantity;
- display metadata;
- new versus incremented collection entries when supported by persisted data;
- total cards added.

Future summaries may add binder usefulness, deck usefulness, missing-deck reductions, duplicates, value, best pull, and availability impact.

## Booster opening rollback

Booster openings are historical records and must not be deleted during rollback.

A rollback is allowed only while the opening status is `RECORDED`. A `ROLLED_BACK` opening must fail cleanly and must not reverse collection or counter data a second time.

A safe rollback must prove that each persisted pulled-card row still has:

- a matching collection snapshot;
- matching original source `ADD` collection transaction quantities for `booster-opening:<openingId>`;
- enough current owned quantity to subtract without making any snapshot negative.

If an entry is missing, source transactions are missing or inconsistent, extra source transactions exist, or subtracting would make a quantity negative, rollback is blocked with a controlled French error.

When rollback is safe, all writes must be atomic in one Prisma transaction. The service:

- marks the opening as `ROLLED_BACK`;
- decrements each matching collection entry by the pulled quantity;
- appends positive `REMOVE` collection transactions sourced as `booster-opening-rollback:<openingId>`;
- keeps zero-quantity collection entries rather than deleting them;
- appends one `ROLLBACK` counter event only when the original opening created an `OPENING_DECREMENT` event.

Rollback never touches binder overrides or deck allocations directly and never recalculates availability itself. Availability reflects updated owned quantities through the existing formula.

## Price rules

Prices are future Phase 8 behavior.

Target pricing granularity:

```text
printed card + physical finish + currency
```

Current pre-Phase-7.5 schema still refers to `card + variant` in price tables. Treat that as current implementation state, not the long-term target.

The price system must support:

- provider price;
- manual override;
- unknown price;
- currency;
- provider raw payload;
- last update date.

Manual override must always win over provider price when active.

Values to compute later:

- card finish value;
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

The domain layer should expose or evolve pure functions equivalent to:

- `isTrackableCard`
- `getAllowedFinishes` / temporary `getAllowedVariants`
- `getBinderReservation`
- `getAvailableCount`
- `getDeckMissingCards`
- `assembleDeck`
- `disassembleDeck`
- `syncBoosterCounter`
- `openBooster`
- `rollbackBoosterOpening`
- `getCardFinishPrice` / temporary `getCardVariantPrice`
- `getOwnedCardValue`
- `getCollectionTotalValue`
- `getDeckTotalValue`
- `getDeckOwnedValue`
- `getDeckMissingValue`
- `getBoosterOpeningValue`
