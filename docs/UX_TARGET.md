# Post-Phase 7 UX target

This document records the UX direction chosen after Phase 7 Booster opening and before Phase 8 Pricing MVP.

The visual mockups are directionally useful for tone, density, colors, and premium TCG feeling, but they are not an exact product specification. The application should not blindly copy every block shown in the mockups.

## Product direction

Riftbound Archive should feel like a dense local desktop TCG companion rather than a set of isolated web admin pages.

Target qualities:

- French UI by default.
- Premium dark fantasy / TCG archive aesthetic.
- Persistent application shell.
- High information density without mixing unrelated workflows.
- Collection-first UX.
- Local-first behavior.
- No Legends of Runeterra assumptions or assets.
- No provider API as a runtime dependency for normal pages.

## Global application shell

The current app uses page-local headers. The target UX needs a shared shell.

Target shell:

- persistent top header;
- persistent left sidebar;
- consistent content frame;
- stable page navigation;
- help entry point;
- no repeated page-specific mega headers where the shell already provides context.

Left navigation should include:

- Tableau de bord;
- Collection;
- Decks;
- Boosters;
- Statistiques;
- Paramètres.

Left navigation should not include a dedicated `Énergies` page for now. Energy / Rune cards are a card type and should be handled through collection filters and stats.

## Header

The mockup header direction is good.

Initial useful header metrics:

- cards owned;
- cards available;
- assembled decks;
- missing cards;
- boosters available.

Useful header actions:

- open booster interface;
- help entry point.

Future header additions after Phase 8:

- estimated collection value, if no footer is used;
- compact value delta, if price history exists later.

Do not show fake or placeholder metrics in the product UI. Header values should come from server-side queries or be omitted until implemented.

## Footer

The footer in the mockups is visually interesting but not required.

Do not use the footer for rule explanations such as binder reservation rules, token/rules behavior, or owned-versus-available definitions. These belong in the help system.

Do not dedicate footer space to Energy summaries unless later testing proves it is useful.

Two acceptable directions:

1. No persistent footer. Put estimated value in the header after Phase 8.
2. Useful compact footer with detailed completion summaries, such as Common, Uncommon, Rare, Epic, Showcase, and estimated value.

The decision should remain explicit and should not be filled with low-value decorative information.

## Help system

Explanatory blocks should not pollute dashboard, collection, settings, or footer screens.

Move the following information into help:

- owned versus available;
- default binder reservation rule;
- token and rules cards ignored;
- Normal versus Foil;
- Showcase behavior;
- theoretical versus assembled decks;
- booster counter and booster annulation behavior.

The help system can start as a modal or side panel opened from a `?` icon and later become contextual.

## Dashboard

The dashboard should be useful as a global overview, not a place for unrelated actions.

Keep or build toward:

- global collection completion;
- completion by gameplay rarity;
- completion by set / extension;
- completion by faction;
- collector/showcase completion;
- estimated value after Phase 8;
- recent useful activity if backed by real data.

Do not include:

- quick actions that belong inside their feature pages;
- a large `Comprendre possédées vs disponibles` block;
- a large `Règle de réservation par défaut` block;
- `Conseil du jour`.

Completion by gameplay rarity should use:

- Common;
- Uncommon;
- Rare;
- Epic.

Collector completion should separately cover:

- Showcase total;
- Alternative;
- Overnumber;
- Signed;
- Ultimate.

If a UI also shows a compact combined list, it must not confuse gameplay rarity with collector treatment.

The rarity completion block should eventually have a toggle equivalent to:

- Normal + Foil;
- Foil only.

Faction completion should use Riftbound factions:

- Fury;
- Calm;
- Mind;
- Body;
- Chaos;
- Order.

Do not treat Terrain or Legend as factions.

## Collection page

The collection page is only for managing the collection. It must not contain deck construction UI.

Target display modes:

1. Grid mode
   - visual card grid;
   - card art visible;
   - Normal/Foil quantities shown together;
   - Showcase printed cards appear as separate cards.

2. Line mode
   - thick rows;
   - small card image on the left;
   - denser than grid while still visual.

3. Compact mode
   - compact rows;
   - no image;
   - optimized for large collections and fast scanning.

The UI should use one display-mode button group, not both a dropdown and a separate button.

Collection rows should be grouped by printed card, not by `card + variant` rows in the final target. For standard printed cards, Normal and Foil quantities should be displayed together.

Remove from collection UX:

- deckbuilder panel;
- variant filter;
- faction dropdown;
- inline info box explaining that tokens/rules are ignored.

Faction filter target:

- faction icons only;
- all active by default;
- clicking one faction from the all-active state filters to that single faction;
- clicking additional factions adds them;
- if all factions are toggled off, the behavior becomes all-active again.

Collection quantity editing target:

- allow changing owned counts directly from collection cards/rows;
- for cards that support Normal and Foil, allow increasing/decreasing either finish independently;
- write through collection transaction flows, never direct UI-only snapshot changes;
- prevent negative quantities.

## Card detail page

The visual direction of the mockup card detail page is broadly useful.

Target improvements:

- large visual card presentation;
- clearer possession panel;
- tabs or grouped sections for information, finishes, history, decks, and related printings;
- related printings section for the same gameplay identity.

Showcase cards should not be displayed as just another possession line of the standard card. A Showcase card is a separate printed card, with different illustration/numbering/treatment, linked through gameplay identity.

The possession panel should replace low-value `binder reserved: 0/1` style rows with a more useful status such as:

- Non acquise;
- Réservée en Normal;
- Réservée en Foil;
- Non réservée.

## Deckbuilder

The deckbuilder should remain on the deck page. Collection pages should not include deck construction.

Target layout:

- left column: filters;
- center: searchable card catalogue / cards;
- right column: deck list and compact deck summary.

Target changes:

- combine deck editor and deck summary into one compact right column;
- move action buttons out of the cramped deck summary area where useful;
- keep save, duplicate, export, assemble/disassemble accessible;
- show missing-card information directly in the deck list;
- remove a separate `Voir cartes manquantes` button if the missing cards are already visible in context.

Assembled decks must remain locked for requirement editing unless explicitly disassembled.

## Boosters UX

Boosters became functional in Phase 7 but need UX polish before they become a product-quality surface.

Target improvements:

- show boosters available in the global header;
- provide an easy `Ouvrir un booster` entry point;
- keep booster counter settings in settings or a dedicated booster settings surface;
- support opening a booster without decrementing the counter;
- provide an opening history surface;
- allow returning to the summary of a previous opening;
- keep annulation available only when safe.

Booster counter settings target:

- X boosters per Y days;
- X boosters per Y weeks;
- X boosters per Y months.

Examples:

- 1 booster every 1 day;
- 1 booster every 2 days;
- 3 boosters every 1 week;
- 10 boosters every 1 month.

Opening form target:

- dynamic list of pulled cards;
- `Ajouter une carte` button;
- remove-line action;
- no fixed limit such as five rows;
- search/select card ergonomics;
- finish selection according to the corrected taxonomy;
- merge duplicate card + finish rows before persistence.

## Settings

The mockup settings page is a useful direction for the synchronization page, but it includes future-looking features.

Potential settings sections:

- Général;
- Synchronisation;
- Boosters;
- Affichage;
- Sauvegarde;
- À propos.

Do not show not-yet-implemented provider sync, backup, cache, import/export, or API-connection controls as if they work.

Do not include a `Règles et rappels importants` block in settings. Those rules belong in help.

## Statistics

A statistics page is useful but can remain a later post-Phase-7.5 or future polish item.

It should not block the corrected taxonomy, collection display foundation, or Phase 8 pricing foundation.

## Required order before Phase 8

Do not start Phase 8 Pricing MVP until these are documented and either implemented or explicitly accepted as prerequisite work:

1. corrected card taxonomy;
2. Normal/Foil as physical finishes grouped under printed cards;
3. Showcase as separate printed cards linked by gameplay identity;
4. app shell foundation;
5. collection display foundation that does not depend on the old `SHOWCASE`-as-variant mental model.

## Document scope

This document does not implement UI changes, schema changes, migrations, provider sync, pricing, or Electron work. It records the target UX and the decisions that later PRs must follow.
