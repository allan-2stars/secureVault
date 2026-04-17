from __future__ import annotations

from fastapi import APIRouter

from app.db import get_connection
from app.models import SettingItem, SettingUpsertRequest
from app.services.settings_service import delete_setting, get_setting, list_settings, upsert_setting


router = APIRouter(prefix="/api/settings", tags=["settings"])


@router.get("", response_model=list[SettingItem])
def read_settings() -> list[SettingItem]:
    with get_connection() as connection:
        return list_settings(connection)


@router.get("/{key}", response_model=SettingItem)
def read_setting(key: str) -> SettingItem:
    with get_connection() as connection:
        return get_setting(connection, key)


@router.post("", response_model=SettingItem)
def create_or_update_setting(payload: SettingUpsertRequest) -> SettingItem:
    with get_connection() as connection:
        return upsert_setting(connection, payload)


@router.delete("/{key}", status_code=204)
def remove_setting(key: str) -> None:
    with get_connection() as connection:
        delete_setting(connection, key)
