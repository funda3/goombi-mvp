# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Goombi is a map-first MVP for discovering B&B and guesthouse listings in Johannesburg North. It's a full-stack app with a FastAPI backend and React/TypeScript frontend. The MVP deliberately omits scraping, marketplace data, payments, and real telco integrations — OTP is a demo placeholder that always succeeds.

## Repository Layout

```
goombi-mvp/
├── backend/    # FastAPI + Python
└── frontend/   # React + TypeScript + Vite
```

## Backend

### Setup & Run

```powershell
cd goombi-mvp\backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### Tests

```powershell
cd goombi-mvp\backend
pytest                          # all tests
pytest tests/test_api.py::test_name   # single test
```

Test fixtures create isolated temporary JSON files per test — no shared state.

## Frontend

### Setup & Run

```powershell
cd goombi-mvp\frontend
Copy-Item .env.example .env     # then edit .env as needed
npm install
npm run dev                     # http://127.0.0.1:5173
```

### Build & Tests

```powershell
npm run build   # TypeScript check + Vite build
npm test        # Vitest (watch mode)
```

### Environment Variables (`.env`)

| Variable | Purpose |
|---|---|
| `VITE_API_BASE_URL` | Backend URL, defaults to `http://127.0.0.1:8000` |
| `VITE_GOOGLE_MAPS_API_KEY` | Optional; falls back to Leaflet if absent |
| `VITE_MAP_MODE=mock` | Forces `MockMap` component (useful for tests) |

## Architecture

### Backend

- **`app/main.py`** — FastAPI app, CORS (localhost:5173), mounts routers, exposes `/healthz`
- **`app/models.py`** — Pydantic v2 models; `Listing` has a validator enforcing workspace-specific required fields (`provider_name`, `workspace_type`, `pricing_status`, `source_url`, `source_note`)
- **`app/storage.py`** — `JsonStore` class: thread-locked reads/writes to `app/data/*.json`; designed to be swapped for a database-backed repository later
- **`app/routes/`** — Route handlers pull `request.app.state.store` (injected at startup)
- **`app/data/listings.json`** — 20 seed records with hardcoded `demo-*` IDs

### Frontend

- **`App.tsx`** — Top-level router: `/` → `HomePage`, `/admin` → `AdminPage`
- **`pages/HomePage.tsx`** — Map-based discovery view
- **`pages/AdminPage.tsx`** — Full CRUD UI; form switches fields based on `category` (accommodation vs workspace); CSV import splits `amenities`/`photos` on `|`
- **`components/MapCanvas.tsx`** — Selects map provider: Google Maps API (if key set) → Leaflet → MockMap
- **`services/api.ts`** — Typed fetch wrapper for all backend calls
- **`hooks/useListingFilters.ts`** — Filter state + derived listing data
- **`types/listing.ts`** — Shared TypeScript types

### Data Models

`Listing` `category` is a literal: `bnb | guesthouse | accommodation | workspace`. Workspace listings require additional fields; accommodation listings require `owner_name`, `owner_phone`, `price_per_night`. `source_type` is always `manual_seed` for now.

### API Routes

All prefixed `/api/`:
- `GET/POST /api/listings`, `GET/PUT/DELETE /api/listings/{id}`
- `GET/POST /api/enquiries`
- `POST /api/otp/request` and `/api/otp/verify` (demo — always succeeds)
