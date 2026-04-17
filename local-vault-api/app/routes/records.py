from __future__ import annotations

from fastapi import APIRouter

from app.db import get_connection
from app.models import RecordItem, RecordUpsertRequest
from app.services.records_service import delete_record, get_record, list_records, upsert_record


router = APIRouter(prefix="/api/records", tags=["records"])


@router.get("", response_model=list[RecordItem])
def read_records() -> list[RecordItem]:
    with get_connection() as connection:
        return list_records(connection)


@router.get("/{record_id}", response_model=RecordItem)
def read_record(record_id: str) -> RecordItem:
    with get_connection() as connection:
        return get_record(connection, record_id)


@router.post("", response_model=RecordItem)
def create_or_update_record(payload: RecordUpsertRequest) -> RecordItem:
    with get_connection() as connection:
        return upsert_record(connection, payload)


@router.delete("/{record_id}", status_code=204)
def remove_record(record_id: str) -> None:
    with get_connection() as connection:
        delete_record(connection, record_id)
