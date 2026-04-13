---
name: Selectable fare panels
overview: Turn each available fare cell into an accessible button with hover styling, track a single selected fare per flight row via CSS classes, and wire clicks through a small exported helper called from the existing `bindAfterRender()` flow.
todos:
  - id: markup-buttons
    content: Wrap priced fare cells in <button> with data attrs + hover/focus-visible + selected class bundle
    status: completed
  - id: bind-export
    content: Export bindFareOptionSelection(root) with row-scoped click logic and JSDoc
    status: completed
  - id: app-wire
    content: Import and call bindFareOptionSelection(main) in bindAfterRender for SEARCH_RESULTS
    status: completed
isProject: false
---

# Selectable fare panels and hover highlight

## Current behavior

`[src/components/searchResults.js](src/components/searchResults.js)` builds a table row per card: each fare column is a plain `<td>` with price text or “Sold out” ([lines 123–128](src/components/searchResults.js)). There is no click or hover affordance.

`[src/app.js](src/app.js)` calls `render()` then `bindAfterRender()` on every navigation (`[navigate](src/app.js)` ~108–114). `bindAfterRender` wires HOME-only controls today; SEARCH_RESULTS has no listeners.

## Approach

1. **Markup (searchResults only for structure)**
  For cells where `p != null` (price available), replace the inner price `<span>` with a `**<button type="button">`** that fills the cell (`w-full`, vertical padding similar to current `py-3`).  
  - Add `**data-fare-option`** plus `**data-flight-id**` and `**data-fare-index**` (or fare bucket name string) for debugging and any future Braze/event hook.  
  - Keep “Sold out” as non-interactive `<td>` (no button, no `cursor-pointer`).  
  - Add shared classes for **hover**: e.g. `transition-colors duration-150 hover:bg-sia-gold/10` (subtle; aligns with existing `sia-gold` in `[tailwind.config.js](tailwind.config.js)`).  
  - Add **focus-visible** ring (`focus:outline-none focus-visible:ring-2 focus-visible:ring-sia-gold`) so keyboard users get feedback.
2. **Selected state (simulate choice)**
  - On click: within the same `**<tr>`**, remove a single agreed class from all fare buttons in that row (e.g. `ring-2 ring-inset ring-sia-gold bg-sia-gold/15` or a dedicated `fare-option-selected` utility bundle in `classList`).  
  - Add that class to the clicked button only.  
  - **Scope:** one selection per flight card row (one active fare per itinerary).  
  - **Persistence:** keep selection **in DOM only** for this iteration (resets on re-render/navigation) unless you later want `StorageManager` — avoids scope creep.
3. **Exported binder**
  Per project JSDoc rules, add and export something like:
   `bindFareOptionSelection(root: HTMLElement): void`
  - `querySelectorAll` on `root` for `[data-fare-option]`, attach `click` handler (or one delegated listener on `root` for fewer nodes — either is fine).  
  - Idempotent: safe if called once per render (current pattern).
4. **App wiring (minimal)**
  In `[src/app.js](src/app.js)`: import the new function and, inside `bindAfterRender`, when `currentView === VIEWS.SEARCH_RESULTS`, call `bindFareOptionSelection(main)` after `main` is resolved (same `getElementById('main-view')` pattern used elsewhere). This is **one import + a short branch**; without it, buttons would never receive handlers.

```mermaid
flowchart LR
  render["renderSearchResults HTML"]
  bind["bindFareOptionSelection(main)"]
  click["click fare button"]
  row["clear row selection"]
  sel["apply selected classes"]
  render --> bind
  bind --> click
  click --> row
  row --> sel
```



## Files to touch


| File                                                                 | Change                                                                                                       |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `[src/components/searchResults.js](src/components/searchResults.js)` | Button markup for priced cells; hover/selected Tailwind classes; export `bindFareOptionSelection` with JSDoc |
| `[src/app.js](src/app.js)`                                           | Import + call binder when view is SEARCH_RESULTS                                                             |


## Out of scope (unless you ask)

- Persisting selection in `StorageManager`  
- Braze `fare_selected` events  
- Changing stepper or navigation after selection

