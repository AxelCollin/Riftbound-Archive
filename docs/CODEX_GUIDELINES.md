# Codex guidelines

These rules apply to any AI coding agent working on this repository.

## Workflow

1. Read the project documentation.
2. Identify the smallest coherent change.
3. Implement only that change.
4. Add or update tests.
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
- Keep database access in queries, route handlers, or server-only modules.
- Keep React components focused on presentation and interaction.
- Use TypeScript strict typing.
- Use Zod for external input validation.
- Prefer pure functions for rule-heavy logic.
- Avoid hidden global state.
- Do not write secrets to logs.
- Do not commit `.env` files.

## Testing rules

Business logic changes require tests.

Minimum tests required over time:

- trackable-card rules;
- variant rules;
- binder reservation rules;
- availability formula;
- deck missing-card calculation;
- deck assembly and disassembly;
- booster counter generation;
- booster opening and rollback;
- price override and value calculations.

## UI rules

- UI copy should be French by default.
- Components must follow the premium dark Riftbound Archive style guide.
- Do not use Legends of Runeterra assets.
- Do not use copyrighted card art unless it comes from official approved Riot sources.
- For missing images, use original placeholders.

## Provider rules

- Riot sync must be optional.
- Price sync must be optional.
- Manual price override must always work.
- Do not assume provider schemas are stable.
- Store raw provider payloads when useful.
- Do not silently accept low-confidence price mappings.

## Review checklist

Before marking a PR ready:

- Does the code follow the domain rules?
- Are calculations centralized?
- Are keys kept server-side?
- Does the app still work without external API keys?
- Are tests present for rule changes?
- Is the PR small enough to review?
