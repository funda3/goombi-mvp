# Goombi Backend

FastAPI API for the Goombi MVP. Local JSON files under `app/data/` act as the first storage layer so routes can later migrate to a database-backed repository.

## Endpoints

- `GET /healthz`
- `GET /api/listings`
- `GET /api/listings/{id}`
- `POST /api/listings`
- `PUT /api/listings/{id}`
- `DELETE /api/listings/{id}`
- `POST /api/enquiries`
- `GET /api/enquiries`
- `POST /api/otp/request`
- `POST /api/otp/verify`

## Run

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

## Test

```powershell
pytest
```
