# GlowGuide API

FastAPI + SQLAlchemy 2 (async, asyncpg) + PostgreSQL + Alembic. Authentication and the application modules
are implemented. Setup steps are in the root README; interactive API docs are at `/docs` when running locally.

## Layout

```
backend/
├── app/
│   ├── main.py              App factory: middleware, error handlers, routers, /health
│   ├── api/
│   │   ├── router.py        Mounts every module router under /api
│   │   └── deps.py          DbSession, CurrentUser (the guard for protected routes)
│   ├── core/                Settings, security (Argon2, JWT, tokens), errors, rate limit, headers
│   ├── db/                  Declarative base + naming convention, async engine/session, model registry
│   ├── services/            Shared integrations (mailer, email templates; YouCam / Open-Meteo / AI later)
│   └── modules/             One package per feature: models · schemas · service · router
│       ├── ai/              free AI tier limits + user-connected models (encrypted keys)
│       ├── auth/            Sign up, log in, Google, sessions, password reset        (S02)
│       ├── users/           User model, public schema, repository
│       ├── profiles/        onboarding + settings data                              (S03, S14)
│       ├── scans/           YouCam analysis, scores, masks and PDF                   (S05, S06)
│       ├── environment/     weather, UV, air quality, city search                    (S07, S08)
│       ├── products/        grounded search + source verification                    (S09, S10)
│       ├── plans/           rules filter + AI ranker                                 (S11, S13)
│       ├── trips/           home vs destination kit                                  (S12)
│       └── saved/           wishlist + in-app notifications                          (S13)
├── alembic/                 Migrations (async env reads DATABASE_URL from settings)
└── tests/                   pytest + httpx against a real Postgres test database
```

Routers stay thin; rules live in each module's `service.py`; persistence helpers in `repository.py`.
Application routes are mounted in `app/api/application.py`; provider clients live in `app/services/`.

## Endpoints

| Method | Path | |
| --- | --- | --- |
| GET | `/api/auth/providers` | Which sign-in methods are enabled (Google client id when configured) |
| POST | `/api/auth/signup` | `{name, email, password}` → 201, sets session cookies, `isNewUser: true` |
| POST | `/api/auth/login` | `{email, password}` |
| POST | `/api/auth/google` | `{code}` from the Google popup (authorization-code flow) |
| POST | `/api/auth/refresh` | Rotates the refresh cookie |
| POST | `/api/auth/logout` | Revokes this device's session, clears cookies |
| GET | `/api/auth/me` | Current user (requires auth) |
| POST | `/api/auth/forgot-password` | `{email}`; same response whether or not the account exists |
| POST | `/api/auth/reset-password` | `{token, password}`; signs out every device |
| GET | `/health` | Liveness + database check |

Interactive docs at `/docs` outside production. JSON bodies are camelCase. Errors always look like
`{"error": {"code": "EMAIL_IN_USE", "message": "...", "fields": {"email": "..."}}}`.

## How sessions work

- **Access token**: HS256 JWT, 15 min, in an httpOnly `gg_access` cookie (or `Authorization: Bearer`). It carries
  the session id, and every protected request checks the session is still active, so logout is immediate.
- **Refresh token**: 48 random bytes, 30 days, httpOnly `gg_refresh` cookie scoped to `/api/auth`. Only its
  SHA-256 hash is stored. Each refresh rotates it with one conditional `UPDATE … RETURNING`, so a replayed or
  raced token fails.
- **`gg_session`**: non-secret hint cookie the frontend middleware uses for redirects. It grants nothing.
- Cookies are `SameSite=Lax` and `Secure` in production. The frontend proxies `/api/*`, so they are first-party.

Other protections: Argon2id hashing off the event loop, constant-time-ish login (dummy hash for unknown
emails), one error message for every login failure, no account enumeration on password reset, single-use
reset links that expire in 30 minutes, rate limiting (20 per 15 minutes per IP) on credential endpoints,
security headers, strict CORS.

## Commands

```bash
source .venv/bin/activate                         # Python 3.12.4 environment
uv sync --locked --inexact                       # install locked dependencies; retain pip/uv tooling
uvicorn app.main:app --reload --port 8800         # dev server
alembic revision --autogenerate -m "..."          # new migration
alembic upgrade head                             # apply migrations
pytest                                           # reads TEST_DATABASE_URL from .env
# Without a local Postgres server, an isolated SQLite test database is also supported:
TEST_DATABASE_URL=sqlite+aiosqlite:////tmp/glowguide_test.db pytest
ruff check . && ruff format .                     # lint + format
```

From the repository root, `python3 scripts/setup_local.py` creates private local configuration, then
`docker compose up -d --wait postgres` starts PostgreSQL 16 on `127.0.0.1:55432`. Development and test
databases have separate logins. Follow the [root README](../README.md) for initial pyenv/venv setup.
`python -m pip install package-name` installs into the activated environment; use `uv add package-name`
when the dependency should also be recorded in the project and lockfile.

## Configuration

See `.env.example`. Required: `DATABASE_URL`, `JWT_SECRET` (32+ chars). Google sign-in needs
`GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` from a "Web application" OAuth client with the frontend URL as an
authorized JavaScript origin. Without `SMTP_HOST`, emails are written to the log.
Skin analysis requires `YOUCAM_API_KEY`; product search/ranking requires `GEMINI_API_KEY`.
`GEMINI_MODEL` defaults to `gemini-3.8-flash`. API keys stay on the server.
