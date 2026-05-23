# Goombi Frontend

React 19 + TypeScript + Vite + Tailwind map-first UI for Goombi. Calls the FastAPI backend and renders a real interactive map via **Leaflet + OpenStreetMap** — no Google Maps API key required.

## Environment

Copy `.env.example` to `.env`.

| Variable | Purpose | Default |
|---|---|---|
| `VITE_API_BASE_URL` | FastAPI base URL | `http://127.0.0.1:8000` |
| `VITE_GOOGLE_MAPS_API_KEY` | Optional Google Maps key (falls back to Leaflet if absent) | — |
| `VITE_MAP_MODE=mock` | Force MockMap component (useful in CI/tests) | — |

## Run

```powershell
npm install
npm run dev      # http://127.0.0.1:5173
```

## Routes

| Path | Description |
|---|---|
| `/` | Map discovery — search, filter, browse, enquire |
| `/admin` | Listing management — add, edit, delete, JSON/CSV import |

## Architecture

- **`MapCanvas`** — selects map provider: Google Maps (if key set) → Leaflet → MockMap (error fallback)
- **`LeafletMap`** — real interactive map; CircleMarkers, region shortcuts, FlyTo, service markers
- **`SearchBar`** — searches listings and suburbs; animates map to result
- **`FilterPanel`** — suburb, price, guests, region, category, verified-only, favourites-only
- **`ListingDetailDrawer`** — full listing detail, nearby services, enquiry form, journey planner trigger
- **`BottomPanel`** — quick-view for the selected listing
- **`JourneyPlannerModal`** — route overview between listings
- **`AdminPage`** — CRUD form, JSON import, CSV import

## Test

```powershell
npm test          # Vitest (single run)
npm run build     # TypeScript check + Vite production build
```
