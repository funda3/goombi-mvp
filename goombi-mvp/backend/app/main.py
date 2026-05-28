import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routes import enquiries, events, listings, nightlife, otp, provider_crm, restaurant_prospects
from .storage import JsonStore

_DEFAULT_ORIGINS = ["http://127.0.0.1:5173", "http://localhost:5173"]
# Matches any HTTP origin on private LAN ranges (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
_LAN_ORIGIN_RE = r"http://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?"


def _cors_origins() -> list[str]:
    raw = os.environ.get("CORS_ORIGINS", "")
    extra = [o.strip() for o in raw.split(",") if o.strip()]
    return _DEFAULT_ORIGINS + extra


def create_app(store: JsonStore | None = None) -> FastAPI:
    app = FastAPI(title="Goombi MVP API", version="0.1.0")
    app.state.store = store or JsonStore()
    app.add_middleware(
        CORSMiddleware,
        allow_origins=_cors_origins(),
        allow_origin_regex=_LAN_ORIGIN_RE,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/healthz")
    def healthz() -> dict[str, str]:
        return {"status": "ok"}

    app.include_router(listings.router)
    app.include_router(events.router)
    app.include_router(nightlife.router)
    app.include_router(provider_crm.router)
    app.include_router(restaurant_prospects.router)
    app.include_router(enquiries.router)
    app.include_router(otp.router)
    return app


app = create_app()
