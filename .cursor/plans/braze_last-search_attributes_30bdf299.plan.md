---
name: Braze last-search attributes
overview: Set four Braze custom user attributes when a validated flight search runs, by extending the existing `runSearchAfterAuth` flow in `app.js` to call `BrazeManager.setCustomAttribute` with the search payload fields (same path used for both immediate logged-in searches and post-registration resume).
todos:
  - id: set-attrs-runSearch
    content: In runSearchAfterAuth (app.js), call BrazeManager.setCustomAttribute for the four sia_last_search_* keys from payload
    status: completed
  - id: optional-flush
    content: "Optional: add BrazeManager.flush helper and call after search attributes for parity with completeRegistration"
    status: completed
isProject: false
---

# Braze last-search custom attributes

## Context

- **Completion point:** A “completed” search in this app is when `[runSearchAfterAuth](src/app.js)` runs: it persists `booking_search`, logs `sia_searched_flight`, fetches results, saves `booking_last_results`, then navigates to search results. This is invoked from the Search button when `user_id` exists, and from the registration success path when `[pendingSearchPayload](src/app.js)` is resumed (~L431–434).
- **Braze API:** `[BrazeManager.setCustomAttribute(key, value)](src/managers/BrazeManager.js)` already calls `braze.getUser()?.setCustomUserAttribute?.(key, value)` with `string | number | boolean` values—appropriate for airport codes and ISO-style date strings from the booking payload.

```mermaid
flowchart LR
  searchClick[Search click]
  authCheck{user_id set?}
  regModal[Open registration]
  completeReg[completeRegistration]
  runSearch[runSearchAfterAuth]
  searchClick --> authCheck
  authCheck -->|no| regModal
  regModal --> completeReg
  completeReg --> runSearch
  authCheck -->|yes| runSearch
  runSearch --> attrs[setCustomAttribute x4]
```



## Implementation

**File:** `[src/app.js](src/app.js)` — inside `runSearchAfterAuth`, immediately after `StorageManager.set('booking_search', payload)` (and alongside the existing `logCustomEvent('sia_searched_flight', …)`), call:


| Attribute key                 | Value                      |
| ----------------------------- | -------------------------- |
| `sia_last_search_origin`      | `payload.origin_code`      |
| `sia_last_search_destination` | `payload.destination_code` |
| `sia_last_search_depart`      | `payload.depart_date`      |
| `sia_last_search_return`      | `payload.return_date`      |


Use `BrazeManager.setCustomAttribute(...)` for each.

**Optional (not required for correctness):** Call `braze.requestImmediateDataFlush` after the attributes so they sync promptly, mirroring `[completeRegistration](src/managers/BrazeManager.js)` (~L218). Today that flush is only inside `BrazeManager`; the minimal approach is to add a small `BrazeManager.requestImmediateDataFlush()` (or `flush()`) wrapper and invoke it once after the four attributes from `runSearchAfterAuth`, avoiding a direct `@braze/web-sdk` import in `app.js`.

## Out of scope

- **No** changes to `[bookingPayload.js](src/logic/bookingPayload.js)` unless you later want shared constants for attribute names.
- **No** README edits unless you explicitly want the new attributes documented alongside existing Braze tracking.
- The existing custom event property typo `orign_code` in `sia_searched_flight` is unrelated; fixing it would be a separate change.

## Verification

- Log in (or complete registration with a pending search), run a search, confirm in Braze (user profile or event/attribute stream) that the four custom attributes update to the submitted origin, destination, depart, and return values.

