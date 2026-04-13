---
name: Braze registration attributes
overview: Add demo loyalty and preference generators in `registrationModal.js`, then call them from `BrazeManager.completeRegistration()` so each successful registration sends five new custom attributes to Braze before flush (including fixed `sia_demo_segment`).
todos:
  - id: generators-registration-modal
    content: Add getSiaDemoRegistrationAttributes + helpers with JSDoc in registrationModal.js (include sia_demo_segment literal)
    status: completed
  - id: braze-complete-registration
    content: Import generator in BrazeManager.completeRegistration and set five setCustomAttribute calls before flush
    status: completed
isProject: false
---

# Braze custom attributes on registration

## Context

- Registration submit is wired in `[src/app.js](src/app.js)` (`bindRegistrationForm`) and calls `[BrazeManager.completeRegistration()](src/managers/BrazeManager.js)` with first/last name, email, optional phone.
- `[src/components/registrationModal.js](src/components/registrationModal.js)` currently only exposes `renderRegistrationModal`, `validateSgPhone`, and `isValidEmail` — no Braze calls.
- Existing registration custom attributes (`registration_completed_at`, `registration_source`) and `Registration - Completed` are already set inside `completeRegistration` (lines ~204–212). The new attributes should be added **in the same method**, after standard profile fields and **before** `requestImmediateDataFlush`, using the existing `[setCustomAttribute](src/managers/BrazeManager.js)` wrapper.

## Implementation

### 1. Add generators in `[registrationModal.js](src/components/registrationModal.js)`

- Add a small `**randomIntInclusive(min, max)`** helper (integers only, inclusive bounds).
- `**pickSiaLoyaltyTier()`**: uniform random choice among `Base`, `Elite Silver`, `Elite Gold`, `PPS Club`.
- `**milesForSiaLoyaltyTier(tier)`** (or inline in a single composer): map tier to ranges:
  - Base → 1–20000  
  - Elite Silver → 25000–50000  
  - Elite Gold → 50000–100000  
  - PPS Club → 100000–500000
- `**pickSiaMealPreference()`**: random among `Normal`, `Gluten Free`, `Vegetarian`, `Vegan`, `Kosher`, `Halal`.
- `**pickSiaSeatPreference()`**: random among `Aisle`, `Window`, `Legroom`, `No Preference`.
- Export one composed function, e.g. `**getSiaDemoRegistrationAttributes()`**, returning:

```js
{
  sia_loyalty_tier: string,
  sia_loyalty_miles: number,
  sia_preference_meals: string,
  sia_preference_seats: string,
  sia_demo_segment: 'true' // fixed string literal for demo cohort tagging
}
```

- `**sia_demo_segment**`: always the string `**"true"**` (not random); include it in this return object so `completeRegistration` can iterate and set all five keys consistently.
- Add JSDoc for the exported API and tier/meal/seat string unions via `@typedef` or `@returns` for maintainability (per workspace documentation rules).

**Note:** This introduces an import from `components/registrationModal.js` into the Braze manager — acceptable here because the module stays side-effect-free for these exports (no DOM); alternatively the same pure functions could live in a tiny `src/utils/` file, but the request targets `registrationModal.js`.

### 2. Wire Braze in `[BrazeManager.js](src/managers/BrazeManager.js)`

- Import `getSiaDemoRegistrationAttributes` from `../components/registrationModal.js`.
- Inside `completeRegistration`, after existing standard fields and **before** (or immediately after) the existing `registration_`* custom attributes, call `getSiaDemoRegistrationAttributes()` once and `setCustomAttribute` for each returned key (five total: four random fields plus fixed `sia_demo_segment` = `"true"`).
- No changes required in `[src/app.js](src/app.js)` unless you later want to log the generated values in `AppLogger` (optional; not required for Braze).

### 3. Out of scope (unless you want parity)

- The **login** path uses `[BrazeManager.login()](src/managers/BrazeManager.js)` only — it does not set these attributes. If demo users who use “login” should also get random loyalty data, that would be a separate change.

## Verification

- Manually: submit registration with valid fields; confirm in Braze (or debug overlay / network) that all five keys appear on the user profile for the test `external_id` (email), including `sia_demo_segment` === `"true"`.
- Quick sanity: run existing lint/build if the project has a standard script (e.g. `npm run build`).

