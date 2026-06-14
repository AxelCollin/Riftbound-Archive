# API providers

## Principle

External data providers must be optional and replaceable.

The application must remain usable without provider credentials.

All external API calls must happen server-side.

## Riot content provider

Riot is the intended official source for Riftbound card content.

Expected responsibilities:

- synchronize official card data;
- synchronize sets;
- synchronize official card images when available;
- store raw provider payloads;
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
- Do not assume French locale exists until verified at runtime.
- Use fallback locale chain.

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

A provider should expose capabilities such as:

```ts
interface PriceProviderCapabilities {
  supportsVariantPricing: boolean;
  supportsLanguageDimension: boolean;
  supportsHistory: boolean;
  supportsEURNative: boolean;
}
```

## Price data

Store:

- provider id;
- card id;
- external game id;
- external set id;
- external card id;
- external variant id;
- mapping confidence;
- variant;
- currency;
- low price;
- market price;
- trend price;
- 1 day average;
- 7 day average;
- 30 day average;
- update timestamp;
- raw JSON.

## Manual override

Manual override must always be supported.

When active, manual override wins over provider price for the same card and variant.

## Mapping workflow

External providers may not use Riot card IDs.

The app must support mappings:

- automatic exact match when possible;
- fuzzy match when safe;
- unresolved state when ambiguous;
- manual mapping screen for unresolved entries.

Never silently apply low-confidence mappings for prices.
