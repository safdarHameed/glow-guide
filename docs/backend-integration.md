# Backend integration

The application follows the blueprint's separation between a person's scan and a place's weather,
shops, currency and plan. Authentication remains the existing cookie/session implementation.
Application screens use API data; only the landing illustrations and `/report/demo` use fixtures.

## Setup

1. Follow the root README: `python3 scripts/setup_local.py` creates private configuration and
   `docker compose up -d --wait postgres` starts PostgreSQL 16 on localhost port 55432. Development
   and test databases have separate logins. Add `YOUCAM_API_KEY` and `GEMINI_API_KEY` to `backend/.env`;
   the script supplies database URLs and a generated JWT secret. Google OAuth and SMTP remain optional.
2. In `backend`, activate the Python 3.12.4 environment with `source .venv/bin/activate`, run
   `uv sync --locked --inexact` and `alembic upgrade head`.
3. Run `uvicorn app.main:app --reload --port 8800`.
4. In `frontend`, run `npm ci` and `npm run dev`. The Next.js origin proxies `/api` to port 8800.
   `BACKEND_URL` can override the API address; use a hosting request timeout that accommodates
   product search and ranking (up to approximately two minutes), and a JSON body limit above 14 MB for 10 MB photos.

Migration `7d41c8a2b601` follows `0efabab2d53e`. It creates profiles, scans, masks, products,
product reports, plans, saved products and notifications. A partial unique index allows only one
current home plan per user. User-owned records and masks are protected by the existing session guard.

## Endpoints

Paths below include `/api`. JSON uses camelCase and the existing `{error: {code, message, fields?}}` error shape.
All endpoints require authentication except the explicitly shared plan endpoint.

| Method | Path | Purpose |
| --- | --- | --- |
| GET / PATCH / PUT | `/profile` | Onboarding, city, goals, avoid/owned lists, budget, consent, units and preferences |
| PATCH / DELETE | `/account` | Update name / delete account and its dependent records; deletion requires `{confirmation: "DELETE"}` |
| GET | `/profile/export` | Download account, profile, scores, routines and wishlist as JSON |
| GET | `/dashboard` | Latest scan, current plan, cached conditions, wishlist and stale-plan state |
| GET | `/cities/search?q=...` | Open-Meteo autocomplete after two characters |
| GET | `/cities/reverse?lat=...&lon=...` | Resolve browser coordinates to a city through Nominatim |
| GET | `/environment?lat=...&lon=...` | Conditions at coordinates, or saved home city when coordinates are omitted |
| POST | `/environment/preview` | Conditions for a selected location, without changing home |
| POST | `/scan` | `{photo: "data:image/jpeg;base64,..."}` or PNG; creates a YouCam task, returns 202 |
| GET | `/scan/{id}` | Poll task / retrieve result; `latest` resolves the latest successful report |
| POST | `/scan/{id}/cancel` | Stop app-side task polling; no successful report is saved afterwards |
| POST | `/scan/{id}/viewed` | Discard a transient report when leaving the report screen with history disabled |
| GET | `/scan/{id}/masks/{feature}` | Authenticated isolated detection mask |
| GET | `/scan/{id}/pdf` | Authenticated one-page PDF report download |
| GET / DELETE | `/scans` | Scan history / delete all scans and masks; deletion requires `DELETE` confirmation |
| POST | `/products/search` | `{city?, query?, category?}`; grounded search, retailer verification and ranking |
| GET | `/products` | Persisted catalog, `cityId`, `category`, `suitableOnly`, `q`, `offset`, `limit` |
| GET | `/products/{id}` | Current ingredient suitability and product details |
| POST | `/products/{id}/report` | `{reason}`; record an issue and invalidate verified-price flags |
| POST | `/plan` | `{city?, scanId?, keepChanges?, refreshProducts?}`; filter, rank and create current plan |
| GET | `/plan/{id}` / `/plans/{id}` | Retrieve a routine; `current` resolves the home routine |
| GET | `/plans` | List saved plans and trips |
| PATCH / DELETE | `/plans/{id}` | Save, rename, activate or edit a routine / delete it |
| POST | `/plans/{id}/duplicate` | `{city}`; keep source scan, rebuild for another city without replacing home |
| POST | `/plans/{id}/share` | Generate an unguessable read-only share URL |
| GET | `/shared/plans/{token}` | Public chosen routine/products; excludes account, profile, scan identifiers and coordinates |
| POST | `/trip` | `{destination, start, end, tripType, buyAt}`; conditions, Keep/Swap/Add kit and draft trip plan |
| GET | `/saved` | Wishlist product ids |
| PUT / DELETE | `/saved/{productId}` | Idempotently add / remove a wishlist item |
| GET | `/notifications` | In-app weather, scan, verified wishlist price drops and trip reminders |
| POST | `/notifications/read` | Persist marking notifications as read |

`PATCH /plans/{id}` accepts `{name?, saved?, isCurrent?, routine?: {morning: [], evening: []}}`.
Every step has `id`, `category`, `productId`, `reason`, `owned`, and optional `edited`.
The API checks product ownership, city, category and ingredient rules again before saving edits.

## Connected flows

- Onboarding saves to the account. Browser coordinates are resolved rather than defaulting to Lahore.
  Skipping saves no goals or budget limit. Browser storage no longer determines scan/profile state.
- Scans upload only in-memory photo bytes to YouCam, then poll the official task endpoint through
  the API every two seconds. The frontend handles success, failure, cancellation and the 60-second
  timeout, with retry retaining the chosen photo. Raw selfies and provider credentials are never
  written to app tables. Only scores and isolated masks are retained. YouCam controls its own
  provider-side retention; app consent wording makes that distinction.
- With history disabled, new reports are excluded from history and discarded when leaving the
  report screen. A 15-minute expiry and a one-minute server cleanup loop cover abandoned tabs.
  Deleting scans removes masks and clears plan scan references; saved routines remain usable.
- Product search uses Gemini with Google Search grounding. Retailer pages are fetched separately.
  Search claims never mark a price verified: JSON-LD price, currency and stock must match. The full
  source ingredient list replaces AI-selected ingredient claims. Unknown ingredients remain
  flagged and excluded from automatic routines. Unreadable/unmatched product pages are dropped.
- Whole-routine budgets count a shared AM/PM purchase once and owned products as zero cost.
  Per-product limits filter candidates separately. Budget/ingredient filters run before ranking;
  only actual candidate ids may be selected. Missing categories produce explicit incomplete-routine
  notes instead of invented products. Regeneration can retain suitable user edits.
- City changes preserve the scan and refresh location data and the routine. Cross-currency budgets
  use cached daily ExchangeRate-API rates, rather than the old sample PKR conversion constants.
- Trips create separate drafts, never replace the home plan, and search in the chosen shopping city.
  Dates within the forecast horizon use forecast averages. Further dates use an explicitly labelled
  same-month historical baseline from the previous year, with no invented future AQI. Trip cards
  become past trips by date. Beach kits require a sourced water-resistance claim for sunscreen and include aftercare when it fits; missing options are labelled. Work preferences are included as packing notes.
- Plan save/rename/duplicate/delete, wishlist, scan comparison, JSON export, name editing, account
  deletion, report PDF and public plan sharing now perform real API operations.

## Verification and operational follow-up

Automated tests cover auth, profile validation, scan status/masks, ownership isolation, retailer
verification, ingredient and budget rules, current-plan uniqueness, saved data, trip isolation,
deletion cascades, private-report expiry, PDF responses, weather caching and currency conversion.
Use a disposable database for tests; the test fixtures clear its tables.

```bash
cd backend
source .venv/bin/activate
pytest                                               # dedicated Docker Postgres test database, from .env
TEST_DATABASE_URL=sqlite+aiosqlite:////tmp/gg_test.db pytest
ruff check .
cd ../frontend
npm run lint
npx tsc --noEmit
npm run build
```

Before deployment, run the tests and migrations against the hosted PostgreSQL instance and complete
one real selfie → report → product search → saved-plan journey with configured provider keys.
These paid-provider calls cannot be validated without credentials and a consented test image.
No provider credentials or production database were present during implementation. Local PostgreSQL 16
is managed by Docker Compose; production database credentials must be configured separately.

Current service limits are explicit: product search returns a completed JSON response rather than
streaming cards; inaccessible retailer pages can reduce coverage. Notifications are in-app and
generated on visits, not push/email delivery. Email is read-only; password changes use the existing
reset-link flow. A future email-change flow needs address verification. Historical trip data is a
labelled baseline, not a prediction. These do not use fabricated fallback results.

## Provider references

- [YouCam file upload and task workflow](https://docs.perfectcorp.com/develop/quick_start_guide)
- [YouCam Skin Analysis v2.1](https://docs.perfectcorp.com/reference/ai_skin_analysis/v2.1)
- [Open-Meteo weather](https://open-meteo.com/en/docs), [air quality](https://open-meteo.com/en/docs/air-quality-api),
  [geocoding](https://open-meteo.com/en/docs/geocoding-api), [historical forecasts](https://open-meteo.com/en/docs/historical-forecast-api)
- [Nominatim reverse lookup](https://nominatim.org/release-docs/latest/api/Reverse/)
- [Gemini Google Search grounding](https://ai.google.dev/gemini-api/docs/google-search)
- [ExchangeRate-API open endpoint](https://www.exchangerate-api.com/docs/free)
