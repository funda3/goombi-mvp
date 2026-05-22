# Goombi Frontend

React/Vite map-first UI for Goombi. It calls the FastAPI backend and uses a mock map when no Google Maps API key is configured.

## Environment

Copy `.env.example` to `.env`.

- `VITE_API_BASE_URL`: FastAPI base URL, default `http://127.0.0.1:8000`
- `VITE_GOOGLE_MAPS_API_KEY`: optional Google Maps JavaScript API key

## Run

```powershell
npm install
npm run dev
```

Map discovery is at `/`; manual listing add, edit, delete, JSON import, and CSV import are at `/admin`.

## Test

```powershell
npm test
```
