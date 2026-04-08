# SIA Demo Booking

## Overview

SIA Demo Booking is a **marketing-style single-page demo** that recreates a Singapore Airlines–inspired shell (dual-level header, hero with overlaid booking widget, multi-column footer) and a mock **flight search** with a four-column fare grid (Lite / Value / Standard / Flexi). Search parameters and session state live in **browser storage**, not the URL query string—only the **view name** is reflected in the hash (`/#/home`, `/#/search-results`).

## Tech Stack

- **UI:** HTML5, Tailwind CSS, [Flowbite](https://flowbite.com/) (tabs, modal, inputs)
- **Icons:** [Font Awesome kit `a21f98a3f6`](https://kit.fontawesome.com/a21f98a3f6.js)
- **Marketing:** [Braze Web SDK](https://www.braze.com/docs/developer_guide/sdk_integration/?sdktab=web) (`@braze/web-sdk`)
- **Hosting:** [Vercel](https://vercel.com/auzani-ridzwans-projects) (static Vite build + `/api` serverless)

## Setup

1. **Clone** the repository from [GitHub — auzaniridzwan-oss](https://github.com/auzaniridzwan-oss) (create the remote repo under that org, then `git remote add origin …` and push `main`).
2. **Install:** `npm ci` (or `npm install`).
3. **Environment:** Copy [`.env.example`](.env.example) to `.env` and set:
   - `VITE_BRAZE_SDK_KEY` — Web SDK key (safe for bundling into client).
   - `VITE_BRAZE_SDK_URL` — SDK endpoint host (e.g. `sdk.iad-03.braze.com`).
   - **Never** put the REST API key in `VITE_*` variables.
4. **Dev server:** `npm run dev` → Vite (default [http://localhost:5173](http://localhost:5173)).
5. **Full-stack local API:** For `/api/braze/user-data`, run [`vercel dev`](https://vercel.com/docs/cli/dev) (often on port 3000) so the proxy exists; Vite is configured to forward `/api` to `http://127.0.0.1:3000`. Without it, the debug REST panel returns network errors locally—that is expected.
6. **Lint / build:** `npm run lint`, `npm run lint:css`, `npm run build`.

### Vercel

Import the GitHub repo into the [auzani-ridzwans-projects](https://vercel.com/auzani-ridzwans-projects) team. Set:

- **Framework:** Vite; **output:** `dist`.
- **Environment variables:** same `VITE_*` as local; plus **server-only** `BRAZE_REST_API_KEY` and `BRAZE_REST_API_URL` (REST base URL, e.g. `https://rest.iad-01.braze.com`).

## Architecture

- **`StorageManager`** — All persisted keys use the `ar_app_` prefix; the API takes the **suffix only** (e.g. `booking_search`, `user_id`).
- **`AppLogger`** — Ring buffer, console output, `getLogs()` for the last 50 entries; **no PII** in log lines. **ERROR** also fires Braze **`App_Error`** (message truncated).
- **`BrazeManager`** — Singleton-style wrapper: `initialize`, `login` / `completeRegistration`, `logCustomEvent`, `subscribe` / `notify` (e.g. **`EVENT_LOGGED`** for the debug overlay).
- **Hash SPA** — Views: `HOME`, `SEARCH_RESULTS`. **`page_view`** is logged on each navigation with `{ page }`.
- **Search** — Validated payload stored as `booking_search` before navigation; mock results cached as `booking_last_results`. **Anonymous users** see a **registration modal** before the first successful search; **`user_id`** persisted after registration is the **lowercased email** (Braze `external_id` / `changeUser`).

## Braze: events and attributes (demo)

| Type | Name | Notes |
|------|------|--------|
| Custom event | `page_view` | `properties.page`: `HOME` / `SEARCH_RESULTS` |
| Custom event | `flight_search` | `destination_code`, `depart_date`, `return_date`, `trip_type` (no PII) |
| Custom event | `Registration - Completed` | `has_phone` only |
| Custom event | `App_Error` | `message` (short, from `AppLogger.error`) |
| User attributes | standard | email, first name, last name, phone (E.164 if provided) |
| Custom attributes | `registration_completed_at` | ISO timestamp |
| Custom attributes | `registration_source` | `flight_search_gate` |

REST profile enrichment for debugging uses **`/api/braze/user-data?id=<external_id>`** (server-side export proxy)—see [Braze REST](https://www.braze.com/docs/api/home/).

## Product chrome

This app uses the **full SIA-style marketing shell** (dual header, hero + booking widget, decorative footer) per project design rules—not a mobile-only bottom nav. **`?debug=true`** enables a **debug drawer** (event log subscribes to **`EVENT_LOGGED`**; REST profile on demand).

## Why storage instead of URL parameters?

Keeping search parameters in **`StorageManager`** avoids leaking demo intent into analytics URLs, matches the workspace rules, and keeps the hash reserved for **view routing** only—while still allowing `?debug=true` for developer tooling.
