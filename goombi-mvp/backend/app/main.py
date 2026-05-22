import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routes import enquiries, listings, otp
from .storage import JsonStore

_DEFAULT_ORIGINS = ["http://127.0.0.1:5173", "http://localhost:5173"]


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
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/healthz")
    def healthz() -> dict[str, str]:
        return {"status": "ok"}

    app.include_router(listings.router)
    app.include_router(enquiries.router)
    app.include_router(otp.router)
    return app


app = create_app()
