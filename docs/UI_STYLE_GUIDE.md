# UI style guide

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

## Layout

Desktop shell:

- persistent left sidebar;
- persistent top KPI bar;
- central content area;
- optional right inspector panel;
- bottom summary strip when useful.

4K target:

- sidebar: around 320px;
- top bar: around 88px;
- inspector panel: 520px;
- card tile: around 236 x 330px;
- main gap: 18px;
- content max width: around 3600px.

1080p adaptation:

- sidebar: around 264px;
- top bar: around 68px;
- inspector panel: 380px;
- card tile: around 184 x 258px;
- main gap: 12px.

## Main screens

### Dashboard

Must show:

- collection completion;
- owned cards;
- available cards;
- missing cards;
- assembled decks;
- booster counter;
- total collection value;
- progress by set;
- progress by rarity;
- recent acquisitions;
- incomplete decks;
- price sync status.

### Collection

Layout:

- left filter panel;
- top search and sort controls;
- central card grid or dense table;
- right card inspector;
- bottom collection summary strip.

Card tile badges should show:

- cost;
- faction/type icon if available;
- rarity;
- owned quantity;
- available quantity;
- missing status;
- binder reservation indicator;
- value.

### Card detail

Must show:

- large card image;
- official card data;
- variants owned;
- variants available;
- binder reservation;
- deck usage;
- price by variant;
- acquisition history;
- personal notes.

### Deckbuilder

Layout:

- deck list/contents panel;
- central searchable card pool;
- right deck summary panel.

Must show:

- deck completeness;
- missing cards;
- unavailable cards;
- cost curve;
- faction distribution;
- value total, owned, missing;
- assembled status.

### Booster opening

Must feel like a ritual but remain efficient.

Must show:

- booster counter;
- frequency setting;
- set selection;
- card entry table/grid;
- decrement toggle;
- post-opening summary.

## UI assets to create

Use original CSS/SVG assets:

- panel frame;
- panel corner;
- decorative divider;
- rarity badge;
- variant badge;
- binder icon;
- deck icon;
- booster icon;
- value icon;
- placeholder card back;
- empty state illustrations.

Official card art must only come from approved Riot sources.
