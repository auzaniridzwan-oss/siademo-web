---
name: Hide Login/Sign Up when logged in
overview: Pass a logged-in flag from `render()` into the shell header and conditionally omit the Login and Sign Up utility links when `user_id` is present, matching the existing session model.
todos:
  - id: shell-loggedin-flag
    content: "shell.js: add loggedIn opt; conditionally render Login + Sign Up"
    status: completed
  - id: app-pass-loggedin
    content: "app.js: renderShellHeader({ ..., loggedIn: hasLoggedInUserId() })"
    status: completed
isProject: false
---

# Hide Login and Sign Up when logged in

## Approach

Use the same **logged-in** definition as the rest of the app: non-empty string in `StorageManager.get('user_id')`. `[app.js](src/app.js)` already exposes `[hasLoggedInUserId()](src/app.js)` for this (used by `isDebugOverlayEligible`).

## Changes

### 1. `[src/components/shell.js](src/components/shell.js)`

- Extend `renderShellHeader` opts: `{ activeView: string, loggedIn?: boolean }` (default `loggedIn` to `false`).
- Update JSDoc for the new property.
- In the navy utility row, render the Login and Sign Up anchors **only when `!loggedIn`**:
  - Keep `[#header-login-link](src/components/shell.js)` on Login when shown (required for `[bindAfterRender](src/app.js)` which uses optional chaining, so missing node when logged in is safe).
  - Sign Up remains a plain `data-nav="utility"` link when shown.

No change to KrisFlyer, Debug recovery, Language, or primary nav.

### 2. `[src/app.js](src/app.js)`

- In `render()`, call `renderShellHeader({ activeView: currentView, loggedIn: hasLoggedInUserId() })` instead of only `activeView`.

After login, registration, or `clearSession` + refresh, the next `render()` (already triggered on navigate / login success) will show or hide these links automatically.

## Verification

- Anonymous: Login + Sign Up visible; Login opens modal.
- After login or registration: both links hidden; no console errors from missing `#header-login-link`.

