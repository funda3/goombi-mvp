from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routes import enquiries, listings, otp
from .storage import JsonStore


def create_app(store: JsonStore | None = None) -> FastAPI:
    app = FastAPI(title="Goombi MVP API", version="0.1.0")
    app.state.store = store or JsonStore()
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://127.0.0.1:5173", "http://localhost:5173"],
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
