# Goombi MVP

Goombi is a **layer-ready spatial discovery platform** for finding accommodation, workspaces, experiences, restaurants, transport nodes, estate-living environments, and event spaces across South Africa. The map runs on **Leaflet + OpenStreetMap** tiles — no Google Maps API key required.

The MVP deliberately excludes scraping, marketplace data, payments, and real telco integrations. OTP is a demo placeholder that always succeeds.

## Supported listing layers

Goombi currently supports 7 discovery layers:

| Layer | Map colour | Description |
|---|---|---|
| Stays | Teal (verified) / Orange | B&Bs, guesthouses, self-catering |
| Workspace | Purple diamond | Coworking, meeting rooms, offices |
| Experiences | Amber | Tours, attractions, activities |
| Eats | Red | Restaurants, cafés, food markets |
| Transport | Slate | Bus depots, taxi ranks, airports |
| Estates | Amber-brown | Estate-living environments (discovery only) |
| Events | Pink | Conference venues, function halls |

> **Scope note:** Goombi does not provide generic relocation advisory, generic property discovery, property sales, rental listings, business-hub intelligence, estate tours, purchase-interest workflows, mortgage workflows, or investment advice. Estate Living is a discovery-only layer for estate-living environments shown on the map. Users seeking property listings, relocation advisory, or investment services should use dedicated platforms.

Goombi includes an Estates discovery layer for estate-living environments. These are map markers for lifestyle discovery only. Goombi does not provide property sales, rentals, estate tours, viewing bookings, mortgage services, investment advice, or relocation advisory services.

### Current estate marker batch

**Western Cape**
- Val de Vie Estate
- Pearl Valley on Val de Vie Estate
- Clara Anna Fontein Lifestyle Estate
- Sitari Country Estate
- Atlantic Beach Estate
- De Zalze Winelands Golf Estate
- Steenberg Estate
- Arabella Country Estate

**KwaZulu-Natal**
- Zimbali Estate
- Mount Edgecombe Country Club Estate
- Simbithi Eco Estate
- Brettenwood Coastal Estate
- Cotswold Downs Golf & Country Estate
- Izinga Estate
- Kindlewood Estate

**Gauteng**
- Waterfall Estate
- Steyn City
- Dainfern Golf Estate
- Woodhill Golf Estate
- Silver Lakes Golf Estate
- Mooikloof Residential Estate
- Blair Atholl Golf & Equestrian Estate
- Helderfontein Estate
- Eagle Canyon Golf Estate
- Kyalami Estate
- Irene Farm Villages
- Thatchfield Golf Estate

## Project layout

```
goombi-mvp/
├── backend/    # FastAPI + Python, JSON file storage
├── frontend/   # React 19 + TypeScript + Vite + Tailwind + Leaflet
└── start-goombi.ps1   # One-command launcher (Windows PowerShell)
```

## Quick start (recommended)

From the `goombi-mvp/` folder:

```powershell
.\start-goombi.ps1
```

This:
1. Checks that ports 8000 and 5173 are free
2. Activates the Python virtual environment and starts `uvicorn`
3. Starts the Vite dev server
4. Opens `http://127.0.0.1:5173` in your default browser

## Manual start

1. Start the backend:

   ```powershell
   cd backend
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   pip install -r requirements.txt
   uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
   ```

2. Start the frontend in a separate terminal:

   ```powershell
   cd frontend
   Copy-Item .env.example .env
   npm install
   npm run dev
   ```

3. Open:
   - `http://127.0.0.1:5173` — map discovery
   - `http://127.0.0.1:5173/admin` — listing management

## Map

The map uses **Leaflet + OpenStreetMap** tiles. It supports:

- Full zoom from world level down to street/suburb level
- Pan, scroll-wheel zoom, and pinch-to-zoom
- Colour-coded CircleMarkers per layer type (see table above); workspace uses a distinctive diamond Marker
- Click-to-open listing detail drawer
- Fit-to-results, South Africa view, and city shortcuts (JHB / CPT / DBN)
- FlyTo animation when selecting a listing from search
- Service markers for nearby amenities (gym, ATM, fuel, etc.)

Google Maps is optionally supported via `VITE_GOOGLE_MAPS_API_KEY`. MockMap is retained as a last-resort error fallback only.

## Key features

| Feature | Description |
|---|---|
| Layer toggles | Show / hide any of the 7 listing layers directly from the filter panel |
| Search bar | Search by suburb name or listing name; flies to result on map |
| Filters | Suburb, price range, guests, region, category, verified-only, favourites-only |
| Listing detail drawer | Photos, tags, partner status, short/long description, contact buttons |
| Journey planner | Route and distance overview between listings |
| Favourites | Persist favourite listings in browser localStorage |
| Bottom panel | Quick-view panel for the selected listing |
| Admin page | Full CRUD, JSON/CSV import, layer-type and partner-status management at `/admin` |
| OTP flow | Demo placeholder — always succeeds; no telco API connected |

## Data model highlights (GMB-01)

Each listing now carries a `listing_type` field (one of the 7 layer values above) in addition to the legacy `category` field. New optional fields include: `partner_status`, `tags`, `short_description`, `long_description`, `price_from/to`, `contact_email`, `contact_phone`, `website_url`, `whatsapp_url`, `featured`, and audience flags (`diaspora_relevant`, `luxury_relevant`, `business_travel_relevant`, `relocation_relevant`, `township_tourism_relevant`).

Old seed records without `listing_type` migrate silently — the backend model validator defaults `listing_type` from `category`.

## Tests

```powershell
# Backend (59 tests)
cd backend; python -m pytest -v
```

```powershell
# Frontend (66 tests)
cd frontend; npm test -- --run
```

```powershell
# TypeScript check + production build
cd frontend; npm run build
```

The bundled seed data covers Gauteng, Western Cape, and KwaZulu-Natal with synthetic demo coordinates. Seed records include accommodation, workspaces, tourism experiences, restaurants, transport nodes, 6 estate living zones (2 per province), and event spaces. All estate records are clearly marked as demo/sample data.

## What this MVP does NOT include

- Real scraping or automated data ingestion
- Marketplace / transactional payments
- Real OTP / telco API (placeholder only)
- AI recommendations or search
- Authentication or user accounts

## Deployment (GitHub Pages + Render)

Goombi can be deployed with this split architecture:

- Frontend: GitHub Pages
- Backend API: Render (`goombi-api`)
- Public frontend URL: `https://funda3.github.io/goombi-mvp/`

### 1) Backend on Render

`render.yaml` already defines:

- `goombi-api` (Python web service rooted at `goombi-mvp/backend`)
- `goombi-frontend` (static service rooted at `goombi-mvp/frontend`)

For the backend service, set environment variables:

- `CORS_ORIGINS=https://funda3.github.io`
- Optional additional origins separated by commas as needed.

Backend URL example:

- `https://goombi-api.onrender.com`

### 2) Frontend production environment

In `frontend/`, create `.env.production` from `.env.production.example`:

```powershell
cd frontend
Copy-Item .env.production.example .env.production
```

Required values:

- `VITE_API_BASE_URL=https://goombi-api.onrender.com`
- `VITE_SHOW_RESTAURANT_PROSPECTS_ON_MAP=true`

### 3) GitHub Pages build and publish

The frontend is configured with Vite base path `/goombi-mvp/` for GitHub Pages.

Run:

```powershell
cd frontend
npm.cmd test
npm.cmd run build
```

Production deploy command:

```powershell
$env:VITE_API_BASE_URL="https://goombi-api.onrender.com"
$env:VITE_SHOW_RESTAURANT_PROSPECTS_ON_MAP="true"
npm.cmd run deploy:prod
```

### 4) Production bundle guard

`deploy:check` fails deployment when:

- the bundle contains `localhost` or `127.0.0.1`
- `VITE_API_BASE_URL` is missing
- the required Render API URL is not present in the built bundle

### 5) Routing and assets

- App navigation uses hash routes, so routes remain stable on GitHub Pages.
- Assets are served from `/goombi-mvp/`.
- Leaflet OpenStreetMap tiles continue loading normally in production.

