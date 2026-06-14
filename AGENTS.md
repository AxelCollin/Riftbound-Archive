# AGENTS.md

This repository is the source of truth for **Riftbound Archive**, a private local application for managing a physical Riftbound: League of Legends Trading Card Game collection.

The project is for personal use only. It is not a public service, a gameplay simulator, or a digital implementation of Riftbound matches.

## Mandatory reading before coding

Before making changes, always read:

- `docs/PRODUCT_SPEC.md`
- `docs/ARCHITECTURE.md`
- `docs/DOMAIN_RULES.md`
- `docs/UI_STYLE_GUIDE.md`
- `docs/API_PROVIDERS.md`
- `docs/ROADMAP.md`
- `docs/CODEX_GUIDELINES.md`

If any implementation detail conflicts with those files, stop and ask for clarification in the PR.

## Non-negotiable project rules

- Do not use Legends of Runeterra assets, card art, UI screenshots, icons, names, or assumptions.
- The application is for **Riftbound**, not Legends of Runeterra.
- Use official Riot Riftbound card images only when they come from the Riot API or another explicitly approved official Riot source.
- If official card images are unavailable, use original placeholders.
- Do not expose API keys to client-side code.
- Keep all external API calls server-side.
- Keep official card data separate from user-owned collection data.
- Keep business logic in pure TypeScript modules under `src/lib/domain`.
- Do not duplicate availability, binder, deck, booster, or price calculations inside React components.
- Add or update tests for every business-rule change.
- Prefer small pull requests with one clear purpose.
- Do not modify unrelated files.
- Do not add a new dependency unless it is needed and justified in the PR.

## Pull request expectations

Every PR must include:

- Summary of changes.
- Business rules affected.
- Tests added or updated.
- Commands run locally.
- Screenshots or recordings for UI changes.
- Known risks and follow-up work.

## Default implementation principles

- Desktop-first, 4K-aware UI.
- French UI copy by default.
- Local-first architecture.
- SQLite database.
- Next.js App Router and TypeScript.
- Prisma for persistence unless a later architecture document explicitly changes that decision.
- Zod for validation at boundaries.
- Vitest for domain tests.
- Price providers must be interchangeable.
- Riot content sync must be optional so the app can run before Riot approval is obtained.

## Core domain formula

Availability is always computed as:

```text
available = owned - binderReserved - assembledDeckAllocated
```

This calculation must be performed per card and per variant.
