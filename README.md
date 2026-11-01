# GlowGuide

Skincare that knows your face and your weather. Scan a selfie (YouCam Skin AI), read live UV, humidity and air
quality for any city (Open-Meteo), and get a routine built from products you can buy locally.

```
glow-guide/
├── frontend/   Next.js 15 + TypeScript + Tailwind v4: landing page, auth screens, app UI
└── backend/    FastAPI + SQLAlchemy 2 (async) + PostgreSQL + Alembic
```

## Status

| Area | State |
| --- | --- |
| Landing page | Done |
| Auth (email + password, Google, sessions, password reset) | Done, backed by the API |
| Profiles, onboarding, dashboard, saved items and settings | Connected to per-user database records |
| Skin scans and report PDF | YouCam upload/task polling, stored scores and isolated masks, authenticated one-page export |
| Environment and cities | Open-Meteo weather/AQI, city search, browser location lookup and hourly/forecast data |
| Products, routines and trips | Grounded Gemini search, retailer verification, ingredient/budget rules, ranking and saved routines |
| Public sample report | Deliberate sample data at `/report/demo`; signed-in screens use the API |

## Run locally

Prerequisites: Node 20+, Docker Desktop, and pyenv with Python 3.12.4.

```bash
# 1. From the repository root: create private local configuration and start PostgreSQL 16
python3 scripts/setup_local.py
docker compose up -d --wait postgres

# 2. Python environment (first run)
cd backend
pyenv exec python -m venv .venv  # backend/.python-version selects 3.12.4
source .venv/bin/activate
python -m pip install --upgrade pip uv
uv sync --locked --inexact      # installs the lockfile; keeps pip/uv available in this environment
alembic upgrade head
uvicorn app.main:app --reload --port 8800

# 3. In a second terminal: web app on :3001
cd frontend                    # from the repository root
npm ci
npm run dev
```

Open http://localhost:3001. Without SMTP settings, password-reset emails are printed in the API log.

The setup script creates root `.env` for Docker, `backend/.env` with database URLs and a generated JWT secret,
and `frontend/.env.local` for the API proxy. Existing configuration is preserved; these files are ignored
by Git. Add `YOUCAM_API_KEY` and `GEMINI_API_KEY` to `backend/.env` to enable scans and product search.

PostgreSQL listens only on `127.0.0.1:55432` because other local projects may use port 5432. The named
Docker volume preserves data across restarts. Development uses `glowguide`; tests use `glowguide_test`
with a separate database login. Run `docker compose stop postgres` to stop it, and the `up` command above
to restart it. `docker compose down` also preserves the volume.


For dependencies the app needs, prefer `uv add requests` or `uv add --dev package-name` inside `backend`;
this records the dependency in `pyproject.toml` and `uv.lock`. Plain pip installs do not update the lockfile.
To install the project using pip alone, run `python -m pip install -e . --group dev` in the activated environment.

## Checks

```bash
cd backend
source .venv/bin/activate
alembic current
pytest                         # reads TEST_DATABASE_URL from backend/.env
ruff check .
```

Tests recreate tables only in the dedicated test database. The development database is kept separate.
See [backend integration notes](docs/backend-integration.md) for the endpoint map and provider checks.
