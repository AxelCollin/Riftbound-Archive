# Product specification

## Product name

**Riftbound Archive**

## Product goal

Riftbound Archive is a local, personal, French-language desktop-first application for managing a physical **Riftbound: League of Legends Trading Card Game** collection.

It must help the user:

- track owned cards and variants;
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

- **Owned cards**: all cards physically owned by the user.
- **Available cards**: cards that can actually be used in new decks after binder reservations and assembled deck allocations.
- **Binder-reserved cards**: cards kept aside for the collection binder.
- **Assembled-deck cards**: cards physically used in decks marked as assembled.
- **Missing cards**: cards needed by a deck or completion target that are not owned or not available in sufficient quantity.

## Main features

### Collection

- View all trackable Riftbound cards.
- Track quantities per card and per variant.
- Track normal, foil, showcase, and future variants if needed.
- Track Energy cards.
- Ignore tokens and rules cards.
- Search and filter cards extensively.
- View owned versus available quantities.
- View binder reservations and deck allocations.
- Track acquisition history.
- Add manual notes and storage information.

### Binder

By default, one copy of each trackable non-showcase card is reserved for the binder.

Reservation priority:

1. Reserve one regular foil if owned.
2. Otherwise reserve one normal copy if that card supports normal copies.
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
- Track deck value, owned value, and missing value.

### Booster opening

- Maintain a booster counter.
- Default generation: +1 booster per day.
- User can configure frequency, such as +1 every 2 days, +1 per week, +2 per day.
- Unopened boosters accumulate.
- Opening a booster decrements the counter by default.
- User can opt out of decrementing for a specific opening.
- User enters cards obtained in the booster.
- The application adds those cards to the collection automatically.
- The post-opening summary must show new binder cards, deck-useful cards, cards that reduce missing deck quantities, duplicates, value, and availability impact.
- Booster openings should be rollbackable when feasible.

### Prices and values

- Track price per card and variant.
- Display card value, deck value, collection value, missing value, binder-reserved value, and assembled-deck value.
- Price providers must be interchangeable.
- Manual price overrides are mandatory.
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

## Non-goals

- No gameplay simulation.
- No matchmaking.
- No automated rules arbitration for live games.
- No public service.
- No user accounts or cloud sync for the MVP.
- No exposed API keys in frontend code.
