from __future__ import annotations

from fastapi import APIRouter

from app.services.health_service import get_health_payload


router = APIRouter(tags=["health"])


@router.get("/health")
def health() -> dict:
    return get_health_payload()
