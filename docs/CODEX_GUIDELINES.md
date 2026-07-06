# Codex guidelines

## Document status

These rules apply to any AI coding agent working on this repository.

This file describes workflow expectations. Domain details live in `docs/DOMAIN_RULES.md`; taxonomy details live in `docs/CARD_TAXONOMY.md`; UX behavior decisions live in `docs/UX_TARGET.md`.

## Workflow

1. Read the project documentation listed in `AGENTS.md`.
2. Identify the smallest coherent change.
3. Implement only that change.
4. Add or update tests when behavior changes.
5. Run the relevant checks.
6. Open a PR with a clear summary.

## Required PR content

Every PR must include:

- What changed.
- Why it changed.
- Business rules touched.
- Tests added or updated.
- Commands run.
- Screenshots for UI changes.
- Known risks.
- Follow-up tasks.

## Coding rules

- Keep domain logic in `src/lib/domain`.
- Keep provider logic in `src/lib/providers`.
- Keep database access in queries, route handlers, services, or server-only modules.
- Keep React components focused on presentation and interaction.
- Use TypeScript strict typing.
- Use Zod for external input validation.
- Prefer pure functions for rule-heavy logic.
- Avoid hidden global state.
- Do not write secrets to logs.
- Do not commit `.env` files.
- Do not access Prisma or SQLite from React client components.

## Phase 7.5 taxonomy rule

The old MVP `CardVariant = NORMAL | FOIL | SHOWCASE` model is implementation debt.

Before changing collection, binder, decks, boosters, card detail, provider mapping, or pricing, read `docs/CARD_TAXONOMY.md` and avoid adding new assumptions that treat Showcase as a simple physical finish beside Normal and Foil.

When temporary compatibility with the old model is needed, the PR must state that it is temporary migration work.

## Testing rules

Business logic changes require tests.

Minimum tests required over time:

- trackable-card rules;
- taxonomy rules;
- physical finish rules;
- collector / showcase treatment rules;
- binder reservation rules;
- availability formula;
- deck missing-card calculation;
- deck assembly and disassembly;
- booster counter generation;
- booster opening and rollback;
- price override and value calculations.

Documentation-only PRs do not need tests, but they should state that validation was not run because the change is docs-only.

## UI rules

- UI copy should be French by default.
- Components must follow the premium dark Riftbound Archive style guide.
- UX behavior must follow `docs/UX_TARGET.md`.
- Do not use Legends of Runeterra assets.
- Do not use copyrighted card art unless it comes from official approved Riot sources.
- For missing images, use original placeholders.

## Provider rules

- Riot sync must be optional.
- Price sync must be optional.
- Manual price override must always work.
- Do not assume provider schemas are stable.
- Store raw provider payloads when useful.
- Do not silently accept low-confidence card or price mappings.
- Normalize provider fields into the app taxonomy explicitly; do not blindly map provider `variant`, `rarity`, `subType`, or `treatment` labels into domain fields.

## Review checklist

Before marking a PR ready:

- Does the code follow the domain rules?
- Does it follow the card taxonomy target?
- Are calculations centralized?
- Are keys kept server-side?
- Does the app still work without external API keys?
- Are tests present for rule changes?
- Is the PR small enough to review?
