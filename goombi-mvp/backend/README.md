# Goombi Backend

FastAPI + Python API for the Goombi MVP. Listings and enquiries are stored in local JSON files under `app/data/` via a thread-safe `JsonStore` — designed to be swapped for a database-backed repository later.

## Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/healthz` | Health check |
| `GET` | `/api/listings` | List all listings |
| `GET` | `/api/listings/{id}` | Get listing by ID |
| `POST` | `/api/listings` | Create listing |
| `PUT` | `/api/listings/{id}` | Update listing |
| `DELETE` | `/api/listings/{id}` | Delete listing |
| `GET` | `/api/enquiries` | List all enquiries |
| `POST` | `/api/enquiries` | Submit enquiry |
| `POST` | `/api/otp/request` | Request OTP (demo — always succeeds) |
| `POST` | `/api/otp/verify` | Verify OTP (demo — always succeeds) |

## Run

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

## Test

```powershell
pytest                                    # all tests
pytest tests/test_api.py::test_name      # single test
```

Test fixtures create isolated temporary JSON files per test — no shared state between tests.
