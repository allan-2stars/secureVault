from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.config import settings
from app.db import get_connection
from app.routes.health import router as health_router
from app.routes.jobs import router as jobs_router
from app.routes.records import router as records_router
from app.routes.settings import router as settings_router
from app.schema import initialize_schema

@asynccontextmanager
async def lifespan(_: FastAPI):
    with get_connection() as connection:
        initialize_schema(connection)
    yield


app = FastAPI(
    title="SecureVault Local Vault API",
    version="0.1.0",
    lifespan=lifespan,
)

app.include_router(health_router)
app.include_router(settings_router)
app.include_router(jobs_router)
app.include_router(records_router)


@app.get("/")
def root() -> dict:
    return {
        "service": "securevault-local-vault-api",
        "status": "running",
        "environment": settings.app_env,
    }
