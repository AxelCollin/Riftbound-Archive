# API providers

## Document status

This document defines provider strategy and integration boundaries.

It does not define the canonical card taxonomy. For taxonomy, use `docs/CARD_TAXONOMY.md`. Provider mapping must adapt provider-specific fields into the app taxonomy instead of forcing provider terminology directly into domain concepts.

## Principle

External data providers must be optional and replaceable.

The application must remain usable without provider credentials.

All external API calls must happen server-side or in a future desktop-local background process that keeps credentials local/server-side.

External card APIs are sync/update sources only. They must not be runtime dependencies for normal application pages. During normal use, the app reads the local SQLite card library and domain/query data that was imported during the latest successful card library sync.

## Card content provider strategy

Provider implementations for card content must remain interchangeable behind a common sync/import boundary.

Recommended provider roles:

1. **Riot official provider** - preferred long-term source for official Riftbound card content when API access is available and approved.
2. **Riftcodex provider** - recommended interim public provider while Riot access or coverage is unavailable.
3. **RiftScribe provider** - optional fallback or secondary provider for comparison, gap filling, or manual recovery workflows.

No provider may expose API keys or secrets to client-side code. React client components must never call provider APIs directly. Any provider fetch must happen from a server-side sync workflow, a local CLI/import workflow, or a future desktop-local background job that keeps credentials server-side/local.

## Local card library

Riftbound Archive maintains a local card library snapshot. The intended card data flow is:

1. The user explicitly triggers **update card library** or **sync card library**.
2. The selected provider fetches the latest card, set, translation, and image metadata.
3. Raw provider payloads are written to local files before mapping.
4. Payloads are mapped and normalized into the app's canonical card/set/taxonomy shape.
5. Normalized official metadata is imported into SQLite.
6. Runtime app pages read local SQLite data through server-side queries and domain modules during normal use.

Normal collection, binder, deckbuilding, booster, and card browsing pages should keep working offline after a successful sync. They must not require live provider availability once the local SQLite card library exists.

Raw provider JSON should be preserved locally for debugging, auditability, and future remapping when provider schemas or app normalization rules change. Local card library snapshots should generally not be committed to Git because they are generated/cache data and may be large or provider-specific. Small test fixtures are acceptable when intentionally curated for tests or mapping examples.

A future folder shape may look like:

```text
data/
  card-library/
    manifest.json
    providers/
      riftcodex/
        sets.json
        cards/
          *.json
      riftscribe/
        sets.json
        cards/
          *.json
tests/
  fixtures/
    card-providers/
```

The manifest should record provider id, sync timestamp, source version or etag when available, locale coverage, import status, and unresolved mapping counts.

## Card mapping and import rules

Card provider mapping must update official card metadata only. It must not overwrite user-owned data such as collection entries, collection transactions, binder overrides, decks, deck allocations, booster openings, manual price overrides, or app settings.

Mapping should be deterministic and conservative:

- preserve the raw provider payload alongside normalized data;
- map exact identifiers when the provider has stable ids;
- use set codes, collector numbers, names, locale fields, rarity, gameplay type, factions, collector treatment, finish support, and print treatment as mapping evidence;
- flag uncertain or ambiguous mappings for review instead of silently applying them;
- record unresolved provider entries so they can be remapped later;
- tolerate provider schema changes and missing optional fields;
- keep locale fallback behavior explicit.

Tokens and rules cards may exist in imported official metadata if a provider exposes them, but domain rules still decide whether they are trackable for collection, deckbuilding, binder, availability, and booster summaries.

## Provider taxonomy mapping

Providers may use terminology that does not match the app taxonomy.

Provider mapping must keep these concepts separate when possible:

- gameplay card type;
- gameplay rarity;
- physical finish;
- collector category;
- showcase treatment;
- faction;
- gameplay identity / rules-equivalent group;
- provider-side product or listing subtype.

Provider fields such as `subType`, `variant`, `rarity`, `treatment`, or `foil` must not be blindly copied into domain fields. They must be normalized through explicit mapping rules.

## Riot content provider

Riot is the intended official source for Riftbound card content.

Expected responsibilities:

- synchronize official card data into the local card library snapshot;
- synchronize sets;
- synchronize official card images when available;
- store raw provider payloads;
- normalize provider data for SQLite import;
- support a locale fallback chain;
- log sync results.

Configuration:

```text
RIOT_API_KEY
RIOT_API_BASE_URL
RIOT_LOCALE_CHAIN=fr-FR,fr-fr,fr,en-US,en
ENABLE_RIOT_SYNC=false
```

The app must work if Riot sync is disabled or unavailable.

Design requirements:

- Be tolerant of schema changes.
- Store raw JSON.
- Do not overwrite user collection data.
- Do not assume French locale exists until verified at sync time.
- Use fallback locale chain.
- Do not make Riot a live runtime dependency for normal app pages.

## Interim and fallback public card providers

Riftcodex is the recommended interim public provider for card content until Riot access is approved and sufficient for the app's needs.

RiftScribe may be used as a fallback or secondary provider when Riftcodex is unavailable, incomplete, or useful for cross-checking provider mappings.

Both providers must use the same local card library sync architecture as Riot:

- fetch server-side/local only during explicit sync;
- preserve raw payloads;
- normalize into the same canonical official metadata model;
- import into SQLite without mutating user-owned data;
- flag uncertain mappings for review;
- keep runtime UI pages reading local SQLite data instead of provider APIs.

## Price provider strategy

Price providers must implement a common interface.

Recommended provider order for MVP:

```text
manual -> tcgcsv -> justtcg -> cardmarket
```

Rationale:

- Manual prices are mandatory and always available.
- TCGCSV is the most concrete fallback for Riftbound pricing.
- JustTCG is technically attractive but must confirm Riftbound support at runtime.
- Cardmarket is useful for European prices but should remain optional because API access can be restricted.

## Provider capabilities

A price provider should expose capabilities such as:

```ts
interface PriceProviderCapabilities {
  supportsFinishPricing: boolean;
  supportsCollectorTreatmentPricing: boolean;
  supportsLanguageDimension: boolean;
  supportsHistory: boolean;
  supportsEURNative: boolean;
}
```

Card content providers should expose equivalent card sync capabilities such as supported locales, raw payload preservation, stable external ids, image metadata support, set metadata support, taxonomy detail support, and incremental sync support.

## Price data mapping

Current pre-Phase-7.5 schema foundations still speak in terms of `card + variant`. Phase 8 pricing behavior should instead be built after Phase 7.5 has clarified printed cards and physical finishes.

Target price mapping should store or derive:

- provider id;
- local printed card id;
- local physical finish;
- local collector category / showcase treatment when relevant;
- external game id;
- external set id;
- external card/product/listing id;
- external provider-side finish/subtype id;
- external provider-side finish/subtype label;
- mapping confidence;
- currency;
- low price;
- market price;
- trend price;
- 1 day average;
- 7 day average;
- 30 day average;
- update timestamp;
- raw JSON.

Provider-side subtype identifiers are not automatically the same as local physical finishes or showcase treatments.

## Manual override

Manual override must always be supported.

When active, manual override wins over provider price for the same local printed card and physical finish.

## Mapping workflow

External providers may not use Riot card IDs.

The app must support mappings:

- automatic exact match when possible;
- fuzzy match when safe;
- unresolved state when ambiguous;
- manual mapping screen for unresolved entries.

Never silently apply low-confidence mappings for prices or card content.
