---
name: Persist login + Braze restore
overview: Unify cold-load restore with BrazeManager.login; persist auth to StorageManager including optional user_session shape; persist user_id before SDK login in the login form so local state survives SDK failures.
todos:
  - id: sync-delegates-login
    content: Update BrazeManager.syncUserFromStorage to call this.login(trimmed user_id) after init; optional _initialized guard; refresh JSDoc.
    status: completed
  - id: user-session-storage
    content: "Add StorageManager key user_session (suffix only): minimal non-PII object (e.g. external_id + optional logged_in_at/source). Write on login and registration alongside user_id; read helpers or fallback user_id for hasLoggedInUserId / UI; keep user_id as Braze external id source of truth for BrazeManager."
    status: completed
  - id: persist-before-braze-login
    content: In bindLoginForm (app.js), call StorageManager.set for user_id (and user_session if added) before BrazeManager.login so persisted state exists if the SDK throws.
    status: completed
isProject: false
---

