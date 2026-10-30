# GlowGuide API

FastAPI + SQLAlchemy 2 (async, asyncpg) + PostgreSQL + Alembic. Currently ships the authentication module;
the other modules from the build map have their folders ready under `app/modules/`.

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
│       ├── auth/            Sign up, log in, Google, sessions, password reset        (S02)
│       ├── users/           User model, public schema, repository
│       ├── profiles/        planned: onboarding + settings data                     (S03, S14)
│       ├── scans/           planned: YouCam analysis, scores, masks                  (S05, S06)
│       ├── environment/     planned: weather, UV, air quality, city search           (S07, S08)
│       ├── products/        planned: AI store search                                 (S09, S10)
│       ├── plans/           planned: rules filter + AI ranker                        (S11, S13)
│       ├── trips/           planned: home vs destination kit                         (S12)
│       └── saved/           planned: wishlist                                        (S13)
├── alembic/                 Migrations (async env reads DATABASE_URL from settings)
└── tests/                   pytest + httpx against a real Postgres test database
```

Routers stay thin; rules live in each module's `service.py`; persistence helpers in `repository.py`.

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
uv sync                                           # install
uv run uvicorn app.main:app --reload --port 8800  # dev server
uv run alembic revision --autogenerate -m "..."   # new migration
uv run alembic upgrade head                       # apply migrations
createdb glowguide_test && uv run pytest          # tests (uses TEST_DATABASE_URL or glowguide_test)
uv run ruff check . && uv run ruff format .       # lint + format
```

## Configuration

See `.env.example`. Required: `DATABASE_URL`, `JWT_SECRET` (32+ chars). Google sign-in needs
`GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` from a "Web application" OAuth client with the frontend URL as an
authorized JavaScript origin. Without `SMTP_HOST`, emails are written to the log.
