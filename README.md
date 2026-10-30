# GlowGuide

Skincare that knows your face and your weather. Scan a selfie (YouCam Skin AI), read live UV, humidity and air
quality for any city (Open-Meteo), and get a routine built from products you can buy locally.

```
glow-guide/
├── frontend/   Next.js 15 + TypeScript + Tailwind v4: landing page, auth screens, app UI
└── backend/    FastAPI + SQLAlchemy 2 (async) + PostgreSQL + Alembic: authentication API
```

## Status

| Area | State |
| --- | --- |
| Landing page | Done |
| Auth (email + password, Google, sessions, password reset) | Done, backed by the API |
| App screens S03–S14 (onboarding, dashboard, scan, report, environment, products, plan, trip, saved, settings) | UI only, on sample data in `frontend/src/lib/mock-data.ts` |
| Scans, environment, products, plans, trips APIs | Planned; module folders are in `backend/app/modules/` |

## Run locally

Prerequisites: Node 20+, Python 3.12+ with [uv](https://docs.astral.sh/uv/), PostgreSQL 16.

```bash
# 1. Database
createdb glowguide

# 2. API on :8800
cd backend
cp .env.example .env            # set DATABASE_URL and JWT_SECRET
uv sync
uv run alembic upgrade head
uv run uvicorn app.main:app --reload --port 8800

# 3. Web app on :3001 (proxies /api/* to the API)
cd ../frontend
npm install
npm run dev
```

Open http://localhost:3001. Without SMTP settings, password-reset emails are printed in the API log.
