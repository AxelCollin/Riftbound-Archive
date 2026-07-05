# Product specification

## Document status

This document is the high-level product specification for Riftbound Archive.

It describes what the product should become. It does not define the exact database schema or migration steps. For card taxonomy details, `docs/CARD_TAXONOMY.md` is the more specific source of truth.

## Product name

**Riftbound Archive**

## Product goal

Riftbound Archive is a local, personal, French-language, desktop-first application for managing a physical **Riftbound: League of Legends Trading Card Game** collection.

It must help the user:

- track owned printed cards and supported physical finishes;
- understand which cards are actually available for deckbuilding;
- reserve cards automatically for a binder;
- build theoretical and assembled decks;
- identify missing cards;
- track booster openings;
- estimate card, deck, booster, and collection values;
- import, export, and back up personal data.

The application is not intended to be published as a public service and must not simulate Riftbound gameplay.

## Core distinction

The application must always distinguish:

- **Owned cards**: all physical cards owned by the user.
- **Available cards**: cards that can actually be used in new decks after binder reservations and assembled deck allocations.
- **Binder-reserved cards**: cards kept aside for the collection binder.
- **Assembled-deck cards**: cards physically used in decks marked as assembled.
- **Missing cards**: cards needed by a deck or completion target that are not owned or not available in sufficient quantity.

## Card taxonomy

The product target distinguishes multiple independent axes:

- gameplay card type, such as Unit, Champion, Terrain, Legend, Spell, Rune, Token, and Rules;
- gameplay rarity, such as Common, Uncommon, Rare, and Epic;
- physical finish, initially Normal and Foil;
- collector category, such as Standard or Showcase;
- showcase treatment, such as Alternative, Overnumber, Signed, and Ultimate;
- faction, such as Fury, Calm, Mind, Body, Chaos, and Order;
- gameplay identity / rules equivalence between different printings of the same gameplay card.

`Showcase` is not a physical finish equivalent to Foil. A Showcase card should be treated as a separate printed card linked to its gameplay-equivalent standard card where applicable.

## Main features

### Collection

- View all trackable Riftbound printed cards.
- Track quantities by printed card and supported physical finish.
- Group Normal and Foil quantities together for standard printed cards in collection views.
- Display Showcase printings as separate printed cards when they have distinct art, numbering, or collector treatment.
- Track Rune / Energy cards.
- Ignore Token and Rules cards in normal collection/deckbuilding/availability flows.
- Search and filter cards extensively.
- View owned versus available quantities.
- View binder reservations and deck allocations.
- Track acquisition history.
- Add manual notes and storage information.

### Binder

By default, one copy of each trackable non-showcase printed card is reserved for the binder.

Reservation priority:

1. Reserve one regular foil copy if owned.
2. Otherwise reserve one normal copy if that printed card supports normal copies.
3. Otherwise reserve nothing.

Showcase cards are never automatically reserved for the binder.

### Deckbuilding

- Create, edit, duplicate, archive, and delete decks.
- Add cards whether owned or not.
- Show missing quantities.
- Show unavailable cards and why they are unavailable.
- Mark decks as assembled or not assembled.
- Assembled decks physically allocate cards and reduce availability globally.
- Non-assembled decks are theoretical and do not reduce availability.
- Track deck value, owned value, and missing value after pricing work exists.

Long-term deckbuilding should be able to reason about gameplay identity while physical allocation chooses a real printed card and physical finish.

### Booster opening

- Maintain a booster counter.
- Default generation: +1 booster per day.
- User can configure frequency, such as +1 every 2 days, +1 per week, or +2 per day.
- Unopened boosters accumulate.
- Opening a booster decrements the counter by default.
- User can opt out of decrementing for a specific opening.
- User enters cards obtained in the booster.
- The application adds those cards to the collection automatically.
- Booster openings should be rollbackable when feasible.

Current Phase 7 summaries are intentionally limited. Future advanced summaries may show new binder cards, deck-useful cards, cards that reduce missing deck quantities, duplicates, value, best pull, and availability impact.

### Prices and values

- Track price per printed card and physical finish.
- Display card value, deck value, collection value, missing value, binder-reserved value, and assembled-deck value.
- Price providers must be interchangeable.
- Manual price overrides are mandatory.
- Manual override must win over provider price.
- TCGCSV is the concrete fallback provider for MVP pricing.
- JustTCG can be used if runtime checks confirm Riftbound coverage.
- Cardmarket is optional and should not be required for the MVP.

## UI goals

- French language.
- Desktop-first.
- 4K-aware.
- Dense and information-rich.
- Premium dark fantasy trading card interface.
- Navy/black background, gold ornaments, subtle blue accents.
- Inspired by Riftbound UI direction without using unauthorized assets.
- Never use Legends of Runeterra assets.

Detailed post-Phase 7 UX decisions are documented in `docs/UX_TARGET.md`.

## Non-goals

- No gameplay simulation.
- No matchmaking.
- No automated rules arbitration for live games.
- No public service.
- No user accounts or cloud sync for the MVP.
- No exposed API keys in frontend code.
