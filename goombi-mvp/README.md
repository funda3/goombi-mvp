# Goombi MVP

Goombi is a narrow map-first MVP for discovering verified B&B and guesthouse demo listings in Johannesburg North. It deliberately excludes scraping, marketplace data, payments, and real telco integrations.

## Project layout

- `backend/`: FastAPI API with local JSON listing and enquiry storage.
- `frontend/`: React, Vite, TypeScript, Tailwind UI with Google Maps JavaScript API support and a mock-map fallback.

## Run locally

1. Start the backend:

   ```powershell
   cd backend
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   pip install -r requirements.txt
   uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
   ```

2. Start the frontend in another terminal:

   ```powershell
   cd frontend
   Copy-Item .env.example .env
   npm install
   npm run dev
   ```

3. Open `http://127.0.0.1:5173` for map discovery and `http://127.0.0.1:5173/admin` for admin listing management.

Without `VITE_GOOGLE_MAPS_API_KEY`, the frontend uses the built-in clickable mock map mode.

## Tests

```powershell
cd backend
pytest
```

```powershell
cd frontend
npm test
```

The 20 bundled listings are synthetic manual seed records with plausible demo coordinates only.
