# Riftbound Archive

Riftbound Archive is a local-first collection manager and deckbuilding companion for **Riftbound: League of Legends Trading Card Game**.

The application is primarily designed for personal use.

## Goals

- Track owned Riftbound cards and variants.
- Distinguish owned cards from actually available cards.
- Reserve cards automatically for a binder.
- Build theoretical and assembled decks.
- Track missing cards.
- Track booster openings with an accumulating counter.
- Estimate card, deck, booster, and collection values.
- Keep official card data separate from personal user data.

## Current status

Initial Next.js foundation.

## Local setup

```bash
npm install
cp .env.example .env.local
npm run db:generate
npm run db:migrate
npm run dev
```

## Validation

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

## Project documentation

- `AGENTS.md`
- `docs/PRODUCT_SPEC.md`
- `docs/ARCHITECTURE.md`
- `docs/DOMAIN_RULES.md`
- `docs/UI_STYLE_GUIDE.md`
- `docs/API_PROVIDERS.md`
- `docs/ROADMAP.md`
- `docs/CODEX_GUIDELINES.md`

## Important note

This project is for **Riftbound**, not Legends of Runeterra. Do not use Legends of Runeterra assets or assumptions.
