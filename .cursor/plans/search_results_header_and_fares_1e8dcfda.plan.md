---
name: Search results header and fares
overview: Update the search results page header to use full airport names from the first result row (with code fallback), derive all fare column amounts from the Value (API) price when present, remove the "Seats" sub-label, and keep IATA codes in each card’s left panel.
todos:
  - id: header-names
    content: Build top route line from f0 origin/destination names with code fallback; leave card headers as codes
    status: completed
  - id: derive-fares
    content: Add getDisplayPriceForBucket (85%/100%/120%/130% when Value set; else raw prices[i])
    status: completed
  - id: remove-seats
    content: Remove Seats span from fare cells; update JSDoc
    status: completed
isProject: false
---

# Search results: full route names and derived fare columns

## Context

- `[src/components/searchResults.js](src/components/searchResults.js)` builds the **page header** with `resolveRouteCodes(routeCodes, f0)` so the centered line is **codes only** (e.g. `SIN → NRT`). Each **card** already uses the same codes in `cardRouteHeader` (lines 103–107)—that stays as-is per your request.
- Live rows from `[src/services/serpapiFlightsClient.js](src/services/serpapiFlightsClient.js)` set only `**prices[1]`** (Value); indices 0, 2, 3 are `null`, which renders as “Sold out” today.
- The **Value** column index matches `[FARE_BUCKETS](src/data/flights.js)` order: `Lite=0`, `Value=1`, `Standard=2`, `Flexi=3`.
- Mock data in `[src/data/flights.js](src/data/flights.js)` includes rows where **Value is null** but other columns have prices (e.g. SQ638). Those should not all become “Sold out” when we add derivation.

## 1. Full airport names in the top summary only

- After resolving `headerCodes` from `routeCodes` + `f0` (keep this for fallbacks), build the **centered route line** using:
  - **Origin:** `(f0.originAirportName || '').trim()` or, if empty, `headerCodes.o`
  - **Destination:** same pattern with `f0.destinationAirportName` and `headerCodes.d`
- Only render the bold line when at least one side can be shown (same guard as today: need something to display for both ends, or combine with existing `pageSubtitle` behavior).

**Do not change** `cardRouteHeader`—it should continue to use `resolveRouteCodes(routeCodes, f)` (abbreviated codes).

## 2. Fare column math (display layer)

Add a small helper in `searchResults.js` (with JSDoc), e.g. `getDisplayPriceForBucket(prices, bucketIndex)`:

- Let `**base = prices[1]`** (Value), when `base != null` and finite.
- **When `base` is set**, return derived amounts for display:
  - Lite (0): `base * 0.85` (15% cheaper)
  - Value (1): `base`
  - Standard (2): `base * 1.20`
  - Flexi (3): `base * 1.30`
- **When `base` is not set**, return `**prices[bucketIndex]`** unchanged so legacy/mock rows (e.g. Value missing but Standard/Flexi present) still behave.

Use this helper inside the `FARE_BUCKETS.map` loop when deciding **Sold out** vs price and when calling `formatSgdWhole`.

## 3. Remove the “Seats” legend

- In the fare `<td>` template (line 94), remove the `<span class="block ...">Seats</span>` so only the gold price remains.

## 4. Types / docs

- Extend the JSDoc on `renderSearchResults`’s `data` / flight shape to mention that **Value** is the API base when present and other columns may be derived for display.

## Files to touch


| File                                                                 | Change                                                                                   |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `[src/components/searchResults.js](src/components/searchResults.js)` | Header line uses full names + fallbacks; `getDisplayPriceForBucket`; drop “Seats”; JSDoc |


**Out of scope (unless you want consistency later):** `[serpapiFlightsClient.js](src/services/serpapiFlightsClient.js)` can stay as-is—derivation in the component matches your request and keeps a single source of truth (API still stores only the Value price in `prices[1]`).