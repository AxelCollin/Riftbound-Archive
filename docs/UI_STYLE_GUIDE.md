# UI style guide

## Document status

This document defines the visual style direction for Riftbound Archive.

It should describe look, density, layout feel, tokens, and asset rules. Product workflow decisions belong in `docs/UX_TARGET.md`. If this file conflicts with `docs/UX_TARGET.md`, the UX target wins for screen behavior and workflow structure.

## Direction

The interface must feel like a premium trading card archive for Riftbound.

It should be:

- dark;
- dense;
- elegant;
- readable;
- ornate but not noisy;
- desktop-first;
- 4K-aware;
- French by default.

The UI may be inspired by Riftbound's visual language, but it must not copy unauthorized assets.

Do not use Legends of Runeterra assets or UI references.

## Visual identity

Mood:

- deep navy;
- near-black panels;
- fine gold borders;
- subtle blue magical highlights;
- premium fantasy archive;
- high-information dashboard.

The UI must not be minimalist. It should show many useful data points while keeping a clear hierarchy.

## Design tokens

Initial CSS tokens:

```css
:root {
  --bg-950: #05080e;
  --bg-900: #08111b;
  --bg-850: #0c1724;
  --bg-800: #102033;
  --gold-500: #c7a866;
  --gold-300: #e6d0a0;
  --azure-500: #3a7bd5;
  --danger-500: #d94a4a;
  --success-500: #79b85a;
  --warning-500: #d9a441;
  --text-100: #f3eedf;
  --text-300: #c7c0af;
  --text-500: #8f8878;
  --radius-panel: 20px;
  --radius-card: 14px;
  --radius-chip: 999px;
  --border-gold: 1px solid rgba(199, 168, 102, 0.42);
  --shadow-panel: 0 24px 80px rgba(0, 0, 0, 0.45);
  --ui-scale: clamp(0.78, 100vw / 3840, 1);
  --sidebar-w: clamp(264px, 16vw, 320px);
  --inspector-w: clamp(380px, 22vw, 520px);
  --content-max: min(3600px, calc(100vw - 48px));
}
```

Tokens are allowed to evolve when the app shell and visual components become real implementation work.

## Layout feel

Desktop shell target:

- persistent left sidebar;
- persistent top KPI/action bar;
- central content area;
- optional right inspector only when the screen needs it;
- optional bottom summary strip only when it carries useful information.

4K target:

- sidebar: around 320px;
- top bar: around 88px;
- inspector panel: around 520px;
- card tile: around 236 x 330px;
- main gap: around 18px;
- content max width: around 3600px.

1080p adaptation:

- sidebar: around 264px;
- top bar: around 68px;
- inspector panel: around 380px;
- card tile: around 184 x 258px;
- main gap: around 12px.

## Screen style notes

These notes define visual direction only. They do not override `docs/UX_TARGET.md` decisions about what each screen should include or exclude.

### Dashboard

Visual direction:

- global overview;
- dense but not noisy;
- panel-based composition;
- progress widgets;
- completion widgets;
- meaningful recent activity when backed by real data.

Do not add decorative advice blocks or rule-explanation panels here. Those belong in the help system.

### Collection

Visual direction:

- left filter panel;
- top search and sort controls;
- central card grid, line view, or compact view;
- card tiles or rows that show useful ownership and availability state;
- no deckbuilder panel on the collection page.

Card tile / row badges may show when implemented and backed by data:

- cost;
- faction/type icon;
- gameplay rarity;
- owned quantity;
- available quantity;
- missing status;
- binder reservation indicator;
- value after pricing exists.

### Card detail

Visual direction:

- large card image or placeholder;
- official card data;
- possession state;
- related printings;
- deck usage;
- acquisition history;
- personal notes;
- pricing only after Phase 8.

### Deckbuilder

Visual direction:

- filters on the left;
- searchable card pool in the center;
- deck contents and compact summary on the right;
- missing-card state visible inline;
- assembled status clearly visible.

### Booster opening

Visual direction:

- efficient but slightly ritualized;
- clear booster counter;
- dynamic pulled-card rows;
- decrement toggle;
- post-opening summary;
- opening history in a product-quality surface.

## UI assets to create

Use original CSS/SVG assets:

- panel frame;
- panel corner;
- decorative divider;
- gameplay rarity badge;
- physical finish badge;
- collector treatment badge;
- faction icon;
- binder icon;
- deck icon;
- booster icon;
- value icon;
- placeholder card back;
- empty state illustrations.

Official card art must only come from approved Riot sources.

Do not use Legends of Runeterra assets, screenshots, icons, art, or assumptions.
