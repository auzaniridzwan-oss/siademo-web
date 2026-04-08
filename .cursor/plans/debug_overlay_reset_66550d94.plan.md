---
name: Debug overlay Reset
overview: Add a destructive "Reset" control to the debug drawer that wipes Braze identity, clears the entire `localStorage` (per your spec), and hard-reloads the page so module state and UI match a cold start.
todos:
  - id: braze-wipe
    content: Add BrazeManager.wipeLocalSdkData() using braze.wipeData() + try/catch + AppLogger
    status: completed
  - id: debug-ui
    content: Add Reset button + copy to debugOverlay.js
    status: completed
  - id: bind-reset
    content: "Wire debug-reset-app in bindDebugOverlay: confirm, wipe, localStorage.clear(), reload"
    status: completed
isProject: false
---

# Debug Overlay: Reset button

## Context

- Debug UI lives in `[src/components/debugOverlay.js](src/components/debugOverlay.js)`; wiring is in `[bindDebugOverlay](src/app.js)` (~L467–516).
- There is no logout API today; auth is `StorageManager` `user_id` + `[BrazeManager.syncUserFromStorage](src/managers/BrazeManager.js)` / `login` / `changeUser`.
- `[StorageManager.clearSession](src/managers/StorageManager.js)` only removes `ar_app_*` keys. You asked for **all** `localStorage` keys — that requires `localStorage.clear()` (or equivalent), not `clearSession` alone.
- In-memory state (`currentView`, `pendingSearchPayload`, `AppLogger.logs`, Braze SDK in-memory user) is not fully reset without a **full reload**. `**location.reload()`** after wipe+clear is the reliable way to return the site to bootstrap-time behavior (`[bootstrapApp](src/app.js)` ~L553–600).

## Implementation

### 1. Braze: identity wipe

Add a small method on `[BrazeManager](src/managers/BrazeManager.js)`, e.g. `wipeLocalSdkData()`, that calls `braze.wipeData()` inside try/catch and logs with `AppLogger` on failure. The SDK already exports `[wipeData](node_modules/@braze/web-sdk/index.d.ts)` — this clears Braze’s persisted device/user data for this origin and aligns with “log out” for the demo.

Call this **before** `localStorage.clear()` so any Braze keys in storage are cleared in one pass with the rest.

### 2. UI: Reset button

In `[debugOverlay.js](src/components/debugOverlay.js)`, add a full-width button (e.g. id `debug-reset-app`) placed near the top of the drawer (after the close row or after “Refresh profile”), with copy like **Reset** or **Reset app** and short helper text that it logs out, clears storage, and reloads. Use existing Tailwind patterns (`text-xs`, borders) consistent with `debug-refresh-profile`.

### 3. Wire-up in `bindDebugOverlay`

In `[app.js](src/app.js)`, attach a click listener on `#debug-reset-app`:

1. Optional but recommended: `window.confirm(...)` so mis-taps do not wipe data.
2. `BrazeManager.wipeLocalSdkData()` (or whatever you name it).
3. `localStorage.clear()` — satisfies “all keys”; note this removes **every** key for this origin (including any non-`ar_app_` keys), which is appropriate for a dev-only reset.
4. `location.reload()` — restores initial route handling (`#/home` if hash empty), re-inits Braze from env, no `user_id`, empty booking keys, fresh `AppLogger` buffer.

No need to manually set `currentView` or call `render()` before reload.

### 4. Out of scope / non-goals

- `**sessionStorage`**: You specified `localStorage` only; omit unless you later want “fresh tab” parity.
- **URL `?debug=true`**: After reload, query string is unchanged; if it was present, the debug FAB stays available. That matches “fresh app” while keeping dev access.

## Files to touch


| File                                                               | Change                                                       |
| ------------------------------------------------------------------ | ------------------------------------------------------------ |
| `[src/managers/BrazeManager.js](src/managers/BrazeManager.js)`     | New `wipeLocalSdkData()` wrapping `braze.wipeData()` + JSDoc |
| `[src/components/debugOverlay.js](src/components/debugOverlay.js)` | Markup for Reset button + short description                  |
| `[src/app.js](src/app.js)`                                         | Click handler in `bindDebugOverlay`                          |


## Verification

- Log in or register, set booking search, open debug → Reset → confirm page reloads to home, header shows logged-out chrome, search is gated again, debug drawer gone unless `?debug=true`.
- Braze debug panels show anonymous / empty user after reload.

