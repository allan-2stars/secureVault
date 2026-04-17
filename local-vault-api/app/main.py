from __future__ import annotations

from fastapi import FastAPI

from app.config import settings
from app.db import get_connection
from app.routes.health import router as health_router
from app.schema import initialize_schema

app = FastAPI(
    title="SecureVault Local Vault API",
    version="0.1.0",
)


@app.on_event("startup")
def startup() -> None:
    with get_connection() as connection:
        initialize_schema(connection)


app.include_router(health_router)


@app.get("/")
def root() -> dict:
    return {
        "service": "securevault-local-vault-api",
        "status": "running",
        "environment": settings.app_env,
    }
